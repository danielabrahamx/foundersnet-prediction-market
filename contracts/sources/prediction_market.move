module prediction_market::market {
    use std::string::String;
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};

    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_NOT_FOUND: u64 = 2;
    const E_MARKET_RESOLVED: u64 = 3;
    const E_MARKET_NOT_RESOLVED: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 6;
    const E_NO_WINNINGS: u64 = 7;
    const E_MARKET_EXPIRED: u64 = 8;
    const E_ALREADY_INITIALIZED: u64 = 9;

    const FEE_BPS: u64 = 200;
    const BPS_BASE: u64 = 10000;

    struct MarketRegistry has key {
        admin: address,
        markets: Table<u64, Market>,
        next_market_id: u64,
        treasury: u64,
        signer_cap: account::SignerCapability,
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
        
        move_to(admin, MarketRegistry {
            admin: admin_addr,
            markets: table::new(),
            next_market_id: 1,
            treasury: 0,
            signer_cap,
        });
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
        
        assert!(creator_addr == registry.admin, E_NOT_ADMIN);
        
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
        registry.next_market_id = market_id + 1;
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
        
        let fee = (amount * FEE_BPS) / BPS_BASE;
        let amount_after_fee = amount - fee;
        registry.treasury = registry.treasury + fee;
        
        let tokens_out = if (is_yes) {
            let k = market.yes_pool * market.no_pool;
            let new_no_pool = market.no_pool + amount_after_fee;
            let new_yes_pool = k / new_no_pool;
            let tokens = market.yes_pool - new_yes_pool;
            market.yes_pool = new_yes_pool;
            market.no_pool = new_no_pool;
            tokens
        } else {
            let k = market.yes_pool * market.no_pool;
            let new_yes_pool = market.yes_pool + amount_after_fee;
            let new_no_pool = k / new_yes_pool;
            let tokens = market.no_pool - new_no_pool;
            market.no_pool = new_no_pool;
            market.yes_pool = new_yes_pool;
            tokens
        };
        
        market.total_liquidity = market.total_liquidity + amount_after_fee;
        
        let trader_addr = signer::address_of(trader);
        let resource_addr = account::get_signer_capability_address(&registry.signer_cap);
        let coins = coin::withdraw<AptosCoin>(trader, amount);
        coin::deposit(resource_addr, coins);
        
        if (!exists<Position>(trader_addr)) {
            move_to(trader, Position {
                positions: table::new(),
            });
        };
        
        let position_store = borrow_global_mut<Position>(trader_addr);
        if (!table::contains(&position_store.positions, market_id)) {
            table::add(&mut position_store.positions, market_id, UserPosition {
                yes_tokens: 0,
                no_tokens: 0,
                total_invested: 0,
            });
        };
        
        let user_pos = table::borrow_mut(&mut position_store.positions, market_id);
        if (is_yes) {
            user_pos.yes_tokens = user_pos.yes_tokens + tokens_out;
        } else {
            user_pos.no_tokens = user_pos.no_tokens + tokens_out;
        };
        user_pos.total_invested = user_pos.total_invested + amount;
    }

    public entry fun resolve_market(
        admin: &signer,
        registry_addr: address,
        market_id: u64,
        winning_outcome: bool,
    ) acquires MarketRegistry {
        let registry = borrow_global_mut<MarketRegistry>(registry_addr);
        let admin_addr = signer::address_of(admin);
        
        assert!(admin_addr == registry.admin, E_NOT_ADMIN);
        assert!(table::contains(&registry.markets, market_id), E_MARKET_NOT_FOUND);
        
        let market = table::borrow_mut(&mut registry.markets, market_id);
        assert!(!market.resolved, E_MARKET_RESOLVED);
        
        market.resolved = true;
        market.winning_outcome = winning_outcome;
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
        
        let winning_tokens = if (market.winning_outcome) {
            user_pos.yes_tokens
        } else {
            user_pos.no_tokens
        };
        
        assert!(winning_tokens > 0, E_NO_WINNINGS);
        
        user_pos.yes_tokens = 0;
        user_pos.no_tokens = 0;
        
        let resource_signer = account::create_signer_with_capability(&registry.signer_cap);
        coin::transfer<AptosCoin>(&resource_signer, claimer_addr, winning_tokens);
    }

    #[view]
    public fun get_market_info(registry_addr: address, market_id: u64): (String, u64, u64, bool, bool) acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        (market.company_name, market.yes_pool, market.no_pool, market.resolved, market.winning_outcome)
    }

    #[view]
    public fun get_yes_price_bps(registry_addr: address, market_id: u64): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(registry_addr);
        let market = table::borrow(&registry.markets, market_id);
        let total = market.yes_pool + market.no_pool;
        (market.no_pool * BPS_BASE) / total
    }

    #[view]
    public fun get_position(user: address, market_id: u64): (u64, u64, u64) acquires Position {
        if (!exists<Position>(user)) {
            return (0, 0, 0)
        };
        let position_store = borrow_global<Position>(user);
        if (!table::contains(&position_store.positions, market_id)) {
            return (0, 0, 0)
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
