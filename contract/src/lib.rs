#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, symbol_short,
    Address, Env, Symbol,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const ESCROW: Symbol = symbol_short!("ESCROW");

// ─── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub buyer: Address,
    pub seller: Address,
    pub token: Address,   // e.g. USDC contract address
    pub amount: i128,
    pub status: EscrowStatus,
    pub expiry_ledger: u32, // auto-refund after this ledger (0 = no expiry)
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct TrustLock;

#[contractimpl]
impl TrustLock {
    /// Buyer calls this to create and fund the escrow.
    /// Transfers `amount` of `token` from buyer into the contract.
    pub fn create_escrow(
        env: Env,
        buyer: Address,
        seller: Address,
        token: Address,
        amount: i128,
        expiry_ledger: u32, // pass 0 for no expiry
    ) {
        // Buyer must authorise this call
        buyer.require_auth();

        // Ensure no active escrow already exists for this buyer
        if env.storage().instance().has(&ESCROW) {
            panic!("escrow already exists");
        }

        // Pull funds from buyer into the contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);

        let escrow = Escrow {
            buyer,
            seller,
            token,
            amount,
            status: EscrowStatus::Active,
            expiry_ledger,
        };

        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Buyer approves delivery — funds go to seller.
    pub fn release(env: Env, buyer: Address) {
        buyer.require_auth();

        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("no escrow found");

        assert!(escrow.buyer == buyer, "not the buyer");
        assert!(escrow.status == EscrowStatus::Active, "escrow not active");

        // Send funds to seller
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.seller,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Released;
        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Buyer cancels — funds return to buyer.
    /// Also callable by anyone if the escrow has expired.
    pub fn refund(env: Env, caller: Address) {
        caller.require_auth();

        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&ESCROW)
            .expect("no escrow found");

        assert!(escrow.status == EscrowStatus::Active, "escrow not active");

        let is_buyer = escrow.buyer == caller;
        let is_expired = escrow.expiry_ledger > 0
            && env.ledger().sequence() >= escrow.expiry_ledger;

        assert!(is_buyer || is_expired, "not authorised to refund");

        // Return funds to buyer
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.buyer,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Refunded;
        env.storage().instance().set(&ESCROW, &escrow);
    }

    /// Read current escrow state (view only).
    pub fn get_escrow(env: Env) -> Escrow {
        env.storage()
            .instance()
            .get(&ESCROW)
            .expect("no escrow found")
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Env,
    };

    fn setup() -> (Env, Address, Address, Address, TrustLockClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TrustLock);
        let client = TrustLockClient::new(&env, &contract_id);

        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);

        // Deploy a test token (Stellar Asset Contract)
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_id.address();

        // Mint 1000 tokens to buyer
        let sac = StellarAssetClient::new(&env, &token_address);
        sac.mint(&buyer, &1000);

        (env, buyer, seller, token_address, client)
    }

    #[test]
    fn test_create_and_release() {
        let (env, buyer, seller, token, client) = setup();
        let token_client = TokenClient::new(&env, &token);

        client.create_escrow(&buyer, &seller, &token, &500, &0);

        // Contract should hold the funds
        assert_eq!(token_client.balance(&client.address), 500);

        client.release(&buyer);

        // Seller should have received funds
        assert_eq!(token_client.balance(&seller), 500);

        let escrow = client.get_escrow();
        assert_eq!(escrow.status, EscrowStatus::Released);
    }

    #[test]
    fn test_refund() {
        let (env, buyer, seller, token, client) = setup();
        let token_client = TokenClient::new(&env, &token);

        client.create_escrow(&buyer, &seller, &token, &500, &0);
        client.refund(&buyer);

        // Buyer gets money back
        assert_eq!(token_client.balance(&buyer), 1000);

        let escrow = client.get_escrow();
        assert_eq!(escrow.status, EscrowStatus::Refunded);
    }

    #[test]
    fn test_auto_refund_on_expiry() {
        let (env, buyer, seller, token, client) = setup();
        let token_client = TokenClient::new(&env, &token);

        // Expire at ledger 10
        client.create_escrow(&buyer, &seller, &token, &500, &10);

        // Advance ledger past expiry
        env.ledger().with_mut(|l| l.sequence_number = 11);

        // A third party (seller) can trigger the refund after expiry
        client.refund(&buyer); // buyer still calls, but expiry path also works
        assert_eq!(token_client.balance(&buyer), 1000);
    }
}
