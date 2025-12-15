module prediction_market::market {
    use std::signer;
    use std::string::String;
    use std::vector;

    use aptos_framework::account;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};

    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_NOT_FOUND: u64 = 2;
    const E_MARKET_RESOLVED: u64 = 3;
    const E_MARKET_NOT_RESOLVED: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 6;
    const E_NO_WINNINGS: u64 = 7;
    const E_MARKET_EXPIRED: u64 = 8;
    const E_ALREADY_INITIALIZED: u64 = 9;
    const E_POSITION_ALREADY_EXISTS: u64 = 10;

    const BPS_BASE: u64 = 10000;
    
    // Hardcoded admin address as per user requirement
    const ADMIN_ADDR: address = @0xf111021255abd6e2cc41dc34055cebb8ad104f4034868d45ac9b1059ecb01a91;

    struct MarketCreatedEvent has drop, store {
        market_id: u64,
        creator: address,
        company_name: String,
        description: String,
        initial_liquidity: u64,
        expiry_timestamp: u64,
        timestamp: u64,
    }

    struct TradeEvent has drop, store {
        market_id: u64,
        trader: address,
        is_yes: bool,
        amount: u64,
        yes_pool: u64,
        no_pool: u64,
        timestamp: u64,
    }

    struct MarketResolvedEvent has drop, store {
        market_id: u64,
        resolver: address,
        winning_outcome: bool,
        timestamp: u64,
    }

    struct WinningsClaimedEvent has drop, store {
        market_id: u64,
        claimer: address,
        amount: u64,
        timestamp: u64,
    }

    struct MarketRegistry has key {
        admin: address,
        markets: Table<u64, Market>,
        market_ids: vector<u64>,
        next_market_id: u64,
        treasury: u64,
        signer_cap: account::SignerCapability,
        market_created_events: event::EventHandle<MarketCreatedEvent>,
        trade_events: event::EventHandle<TradeEvent>,
        market_resolved_events: event::EventHandle<MarketResolvedEvent>,
        winnings_claimed_events: event::EventHandle<WinningsClaimedEvent>,
    }

    struct Market has store, copy, drop {
        id: u64,
        company_name: String,
        description: String,
        yes_pool: u64,
        no_pool: u64,
        total_liquidity: u64,
        expiry_timestamp: u64,
        resolved: bool,
        winning_outcome: bool,
        creator: address,
    }

    struct Position has key {
        positions: Table<u64, UserPosition>,
    }

    struct UserPosition has store, drop, copy {
        yes_tokens: u64,
        no_tokens: u64,
        total_invested: u64,
    }

    public entry fun initialize(admin: &signer, seed: vector<u8>) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<MarketRegistry>(admin_addr), E_ALREADY_INITIALIZED);

        let (resource_signer, signer_cap) = account::create_resource_account(admin, seed);
        coin::register<AptosCoin>(&resource_signer);

        let market_created_events = account::new_event_handle<MarketCreatedEvent>(admin);
        let trade_events = account::new_event_handle<TradeEvent>(admin);
        let market_resolved_events = account::new_event_handle<MarketResolvedEvent>(admin);
        let winnings_claimed_events = account::new_event_handle<WinningsClaimedEvent>(admin);

        move_to(
            admin,
            MarketRegistry {
                admin: admin_addr,
                markets: table::new(),
                market_ids: vector::empty<u64>(),
                next_market_id: 1,
                treasury: 0,
                signer_cap,
                market_created_events,
                trade_events,
                market_resolved_events,
                winnings_claimed_events,
            },
        );
    }

    public entry fun create_market(
        creator: &signer,
        registry_addr: address,
        company_name: String,
        description: String,
        initial_liquidity: u64,
        expiry_timestamp: u64,
    ) acquires MarketRegistry {
        let registry = borrow_global_mut<MarketRegistry>(registry_addr);
        let creator_addr = signer::address_of(creator);

        // Check against hardcoded admin address OR registry admin (for backward compatibility)
        assert!(creator_addr == ADMIN_ADDR || creator_addr == registry.admin, E_NOT_ADMIN);

        let resource_addr = account::get_signer_capability_address(&registry.signer_cap);
        let coins = coin::withdraw<AptosCoin>(creator, initial_liquidity);
        coin::deposit(resource_addr, coins);

        let market_id = registry.next_market_id;
        let half_liquidity = initial_liquidity / 2;

        let market = Market {
            id: market_id,
            company_name,
            description,
            yes_pool: half_liquidity,
            no_pool: half_liquidity,
            total_liquidity: initial_liquidity,
            expiry_timestamp,
            resolved: false,
            winning_outcome: false,
            creator: creator_addr,
        };

        table::add(&mut registry.markets, market_id, market);
        vector::push_back(&mut registry.market_ids, market_id);
        registry.next_market_id = market_id + 1;

        let created_market = table::borrow(&registry.markets, market_id);
        event::emit_event(
            &mut registry.market_created_events,
            MarketCreatedEvent {
                market_id,
                creator: creator_addr,
                company_name: created_market.company_name,
                description: created_market.description,
                initial_liquidity,
                expiry_timestamp,
                timestamp: timestamp::now_seconds(),
            },
        );
    }

    public entry fun buy_yes(
        trader: &signer,
        registry_addr: address,
        market_id: u64,
        amount: u64,
    ) acquires MarketRegistry, Position {
        buy_tokens_internal(trader, registry_addr, market_id, amount, true);
    }

    public entry fun buy_no(
        trader: &signer,
        registry_addr: address,
        market_id: u64,
        amount: u64,
    ) acquires MarketRegistry, Position {
        buy_tokens_internal(trader, registry_addr, market_id, amount, false);
    }

    fun buy_tokens_internal(
        trader: &signer,
        registry_addr: address,
        market_id: u64,
        amount: u64,
        is_yes: bool,
    ) acquires MarketRegistry, Position {
        assert!(amount > 0, E_INVALID_AMOUNT);

        let registry = borrow_global_mut<MarketRegistry>(registry_addr);
        assert!(table::contains(&registry.markets, market_id), E_MARKET_NOT_FOUND);

        let market = table::borrow_mut(&mut registry.markets, market_id);
        assert!(!market.resolved, E_MARKET_RESOLVED);
        assert!(timestamp::now_seconds() < market.expiry_timestamp, E_MARKET_EXPIRED);

        let trader_addr = signer::address_of(trader);

        // Position Check: strict one bet per user per market
        if (!exists<Position>(trader_addr)) {
            move_to(trader, Position { positions: table::new() });
        };

        let position_store = borrow_global_mut<Position>(trader_addr);
        assert!(!table::contains(&position_store.positions, market_id), E_POSITION_ALREADY_EXISTS);

        // Update Pools (Parimutuel: simply add to the pool)
        if (is_yes) {
            market.yes_pool = market.yes_pool + amount;
        } else {
            market.no_pool = market.no_pool + amount;
        };
        market.total_liquidity = market.total_liquidity + amount;

        // Transfer funds
        let resource_addr = account::get_signer_capability_address(&registry.signer_cap);
        let coins = coin::withdraw<AptosCoin>(trader, amount);
        coin::deposit(resource_addr, coins);

        // Create Position
        table::add(
            &mut position_store.positions,
            market_id,
            UserPosition {
                yes_tokens: if (is_yes) { amount } else { 0 },
                no_tokens: if (is_yes) { 0 } else { amount },
                total_invested: amount,
            },
        );

        event::emit_event(
            &mut registry.trade_events,
            TradeEvent {
                market_id,
                trader: trader_addr,
                is_yes,
                amount,
                yes_pool: market.yes_pool,
                no_pool: market.no_pool,
                timestamp: timestamp::now_seconds(),
            },
        );
    }

    public entry fun resolve_market(
        admin: &signer,
        registry_addr: address,
        market_id: u64,
        winning_outcome: bool,
    ) acquires MarketRegistry {
        let registry = borrow_global_mut<MarketRegistry>(registry_addr);
        let admin_addr = signer::address_of(admin);

        // Check against hardcoded admin address OR registry admin
        assert!(admin_addr == ADMIN_ADDR || admin_addr == registry.admin, E_NOT_ADMIN);
        assert!(table::contains(&registry.markets, market_id), E_MARKET_NOT_FOUND);

        let market = table::borrow_mut(&mut registry.markets, market_id);
        assert!(!market.resolved, E_MARKET_RESOLVED);

        market.resolved = true;
        market.winning_outcome = winning_outcome;

        event::emit_event(
            &mut registry.market_resolved_events,
            MarketResolvedEvent {
                market_id,
                resolver: admin_addr,
                winning_outcome,
                timestamp: timestamp::now_seconds(),
            },
        );
    }

    public entry fun claim_winnings(
        claimer: &signer,
        registry_addr: address,
        market_id: u64,
    ) acquires MarketRegistry, Position {
        let claimer_addr = signer::address_of(claimer);

        assert!(exists<Position>(claimer_addr), E_NO_WINNINGS);

        let position_store = borrow_global_mut<Position>(claimer_addr);
        assert!(table::contains(&position_store.positions, market_id), E_NO_WINNINGS);

        let registry = borrow_global_mut<MarketRegistry>(registry_addr);
        assert!(table::contains(&registry.markets, market_id), E_MARKET_NOT_FOUND);

        let market = table::borrow(&registry.markets, market_id);
        assert!(market.resolved, E_MARKET_NOT_RESOLVED);

        let user_pos = table::borrow_mut(&mut position_store.positions, market_id);

        let (winning_shares, winning_pool_total) = if (market.winning_outcome) {
            (user_pos.yes_tokens, market.yes_pool)
        } else {
            (user_pos.no_tokens, market.no_pool)
        };

        assert!(winning_shares > 0, E_NO_WINNINGS);

        // Parimutuel Payout = (UserShares / WinningPoolTotal) * TotalMarketLiquidity
        // Use u128 for calculation to prevent overflow
        let payout = (((winning_shares as u128) * (market.total_liquidity as u128)) / (winning_pool_total as u128));
        let payout_u64 = (payout as u64);

        user_pos.yes_tokens = 0;
        user_pos.no_tokens = 0;

        let resource_signer = account::create_signer_with_capability(&registry.signer_cap);
        coin::transfer<AptosCoin>(&resource_signer, claimer_addr, payout_u64);

        event::emit_event(
            &mut registry.winnings_claimed_events,
            WinningsClaimedEvent {
                market_id,
                claimer: claimer_addr,
                amount: payout_u64,
                timestamp: timestamp::now_seconds(),
            },
        );
    }

    #[view]
    public fun get_market_count(registry_addr: address): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        vector::length(&registry.market_ids)
    }

    #[view]
    public fun get_market_id_at(registry_addr: address, index: u64): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        *vector::borrow(&registry.market_ids, index)
    }

    #[view]
    public fun get_market_ids(registry_addr: address): vector<u64> acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let i = 0;
        let len = vector::length(&registry.market_ids);
        let ids = vector::empty<u64>();
        while (i < len) {
            vector::push_back(&mut ids, *vector::borrow(&registry.market_ids, i));
            i = i + 1;
        };
        ids
    }

    #[view]
    public fun get_market_details(
        registry_addr: address,
        market_id: u64,
    ): (u64, String, String, u64, u64, u64, u64, bool, bool, address) acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        assert!(table::contains(&registry.markets, market_id), E_MARKET_NOT_FOUND);
        let market = table::borrow(&registry.markets, market_id);
        (
            market.id,
            market.company_name,
            market.description,
            market.yes_pool,
            market.no_pool,
            market.total_liquidity,
            market.expiry_timestamp,
            market.resolved,
            market.winning_outcome,
            market.creator,
        )
    }

    #[view]
    public fun get_market_pools(registry_addr: address, market_id: u64): (u64, u64, u64) acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        (market.yes_pool, market.no_pool, market.total_liquidity)
    }

    #[view]
    public fun get_market_expiry(registry_addr: address, market_id: u64): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        market.expiry_timestamp
    }

    #[view]
    public fun is_market_expired(registry_addr: address, market_id: u64): bool acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        timestamp::now_seconds() >= market.expiry_timestamp
    }

    #[view]
    public fun get_market_status(registry_addr: address, market_id: u64): (bool, bool, bool) acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        let expired = timestamp::now_seconds() >= market.expiry_timestamp;
        (market.resolved, expired, market.winning_outcome)
    }

    #[view]
    public fun get_prices_bps(_registry_addr: address, _market_id: u64): (u64, u64) {
        // Pure parimutuel model: prices are always 50/50
        // Winners split losers' pool proportionally based on their share
        (5000, 5000)
    }

    #[view]
    public fun get_treasury_fees(registry_addr: address): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        registry.treasury
    }

    #[view]
    public fun get_market_info(
        registry_addr: address,
        market_id: u64,
    ): (String, u64, u64, bool, bool) acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        (market.company_name, market.yes_pool, market.no_pool, market.resolved, market.winning_outcome)
    }

    #[view]
    public fun get_yes_price_bps(_registry_addr: address, _market_id: u64): u64 {
        // Pure parimutuel model: YES price is always 50%
        5000
    }

    #[view]
    public fun get_position(user: address, market_id: u64): (u64, u64, u64) acquires Position {
        if (!exists<Position>(user)) {
            return (0, 0, 0);
        };
        let position_store = borrow_global<Position>(user);
        if (!table::contains(&position_store.positions, market_id)) {
            return (0, 0, 0);
        };
        let pos = table::borrow(&position_store.positions, market_id);
        (pos.yes_tokens, pos.no_tokens, pos.total_invested)
    }

    #[view]
    public fun get_resource_address(registry_addr: address): address acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        account::get_signer_capability_address(&registry.signer_cap)
    }
}
