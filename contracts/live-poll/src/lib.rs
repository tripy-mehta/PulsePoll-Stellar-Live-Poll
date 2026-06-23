#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Count(Symbol),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteEvent {
    pub voter: Address,
    pub option: Symbol,
    pub count: u32,
}

#[contract]
pub struct LivePollContract;

#[contractimpl]
impl LivePollContract {
    pub fn vote(env: Env, voter: Address, option: Symbol) -> u32 {
        voter.require_auth();
        validate_option(&option);

        let key = DataKey::Count(option.clone());
        let current = env.storage().persistent().get(&key).unwrap_or(0_u32);
        let next = current.saturating_add(1);

        env.storage().persistent().set(&key, &next);
        env.events().publish(
            (symbol_short!("vote"), option.clone()),
            VoteEvent {
                voter,
                option,
                count: next,
            },
        );

        next
    }

    pub fn results(env: Env) -> Map<Symbol, u32> {
        let mut map = Map::new(&env);

        for option in [symbol_short!("dex"), symbol_short!("nft"), symbol_short!("auction")] {
            let key = DataKey::Count(option.clone());
            let count = env.storage().persistent().get(&key).unwrap_or(0_u32);
            map.set(option, count);
        }

        map
    }
}

fn validate_option(option: &Symbol) {
    if option != &symbol_short!("dex")
        && option != &symbol_short!("nft")
        && option != &symbol_short!("auction")
    {
        panic!("invalid poll option");
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn vote_updates_results() {
        let env = Env::default();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(&env, &contract_id);
        let voter = Address::generate(&env);

        env.mock_all_auths();

        let count = client.vote(&voter, &symbol_short!("dex"));
        let results = client.results();

        assert_eq!(count, 1);
        assert_eq!(results.get(symbol_short!("dex")).unwrap(), 1);
        assert_eq!(results.get(symbol_short!("nft")).unwrap(), 0);
    }
}
