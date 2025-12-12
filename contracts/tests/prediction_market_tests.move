module prediction_market::market_tests {
    use std::string;

    use aptos_framework::account;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;

    use prediction_market::market;

    fun mint_to(addr: address, amount: u64, mint_cap: &coin::MintCapability<AptosCoin>) {
        let coins = coin::mint<AptosCoin>(amount, mint_cap);
        coin::deposit<AptosCoin>(addr, coins);
    }

    #[test]
    fun test_full_lifecycle_yes_wins() {
        let aptos_framework_signer = account::create_account_for_test(@aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework_signer);

        let admin = account::create_account_for_test(@0xa11ce);
        let yes_trader = account::create_account_for_test(@0xb0b);
        let no_trader = account::create_account_for_test(@0xc0de);

        coin::register<AptosCoin>(&admin);
        coin::register<AptosCoin>(&yes_trader);
        coin::register<AptosCoin>(&no_trader);

        mint_to(@0xa11ce, 1000, &mint_cap);
        mint_to(@0xb0b, 1000, &mint_cap);
        mint_to(@0xc0de, 1000, &mint_cap);

        market::initialize(&admin, x"01");

        market::create_market(
            &admin,
            @0xa11ce,
            string::utf8(b"Acme"),
            string::utf8(b"Will Acme raise in 2025?"),
            100,
            1000,
        );

        assert!(market::get_market_count(@0xa11ce) == 1, 1);
        assert!(market::get_market_id_at(@0xa11ce, 0) == 1, 2);

        market::buy_yes(&yes_trader, @0xa11ce, 1, 10);
        market::buy_no(&no_trader, @0xa11ce, 1, 10);

        let (yes_tokens, _, _) = market::get_position(@0xb0b, 1);
        let before_claim = coin::balance<AptosCoin>(@0xb0b);

        market::resolve_market(&admin, @0xa11ce, 1, true);
        market::claim_winnings(&yes_trader, @0xa11ce, 1);

        let after_claim = coin::balance<AptosCoin>(@0xb0b);
        assert!(after_claim == before_claim + yes_tokens, 0);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test]
    #[expected_failure(abort_code = 7)]
    fun test_loser_cannot_claim() {
        let aptos_framework_signer = account::create_account_for_test(@aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework_signer);

        let admin = account::create_account_for_test(@0xa11ce);
        let yes_trader = account::create_account_for_test(@0xb0b);
        let no_trader = account::create_account_for_test(@0xc0de);

        coin::register<AptosCoin>(&admin);
        coin::register<AptosCoin>(&yes_trader);
        coin::register<AptosCoin>(&no_trader);

        mint_to(@0xa11ce, 1000, &mint_cap);
        mint_to(@0xb0b, 1000, &mint_cap);
        mint_to(@0xc0de, 1000, &mint_cap);

        market::initialize(&admin, x"01");

        market::create_market(
            &admin,
            @0xa11ce,
            string::utf8(b"Acme"),
            string::utf8(b"Will Acme raise in 2025?"),
            100,
            1000,
        );

        assert!(market::get_market_count(@0xa11ce) == 1, 1);
        assert!(market::get_market_id_at(@0xa11ce, 0) == 1, 2);

        market::buy_yes(&yes_trader, @0xa11ce, 1, 10);
        market::buy_no(&no_trader, @0xa11ce, 1, 10);

        market::resolve_market(&admin, @0xa11ce, 1, true);
        market::claim_winnings(&no_trader, @0xa11ce, 1);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}
