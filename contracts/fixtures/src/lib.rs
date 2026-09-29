#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Env, Map, Symbol,
};

#[contract]
pub struct SoroSloFixture;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum FixtureError {
    Deliberate = 1,
}

#[contractimpl]
impl SoroSloFixture {
    pub fn healthy() -> bool {
        true
    }

    pub fn value() -> i128 {
        42
    }

    pub fn double(value: i128) -> i128 {
        value * 2
    }

    pub fn snapshot(env: Env) -> Map<Symbol, i128> {
        let mut snapshot = Map::new(&env);
        snapshot.set(symbol_short!("value"), 42);
        snapshot.set(symbol_short!("ledger"), i128::from(env.ledger().sequence()));
        snapshot.set(
            symbol_short!("timestamp"),
            i128::from(env.ledger().timestamp()),
        );
        snapshot
    }

    pub fn fail() -> Result<(), FixtureError> {
        Err(FixtureError::Deliberate)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn deterministic_reads_are_stable() {
        let env = Env::default();
        let contract_id = env.register(SoroSloFixture, ());
        let client = SoroSloFixtureClient::new(&env, &contract_id);

        assert!(client.healthy());
        assert_eq!(client.value(), 42);
        assert_eq!(client.double(&42), 84);

        let snapshot = client.snapshot();
        assert_eq!(snapshot.get(symbol_short!("value")), Some(42));
    }
}
