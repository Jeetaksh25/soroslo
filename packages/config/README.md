# @soroslo/config

Versioned SoroSLO configuration parsing and validation.

M2 implements the v0.1 configuration contract:

- strict YAML schema with unknown-field rejection;
- environment substitution before final schema validation;
- direct environment references for webhook secrets;
- known Stellar secret-seed rejection;
- Testnet/Mainnet/custom network validation;
- service/check/step identifier uniqueness;
- contract strkey validation;
- typed Soroban arguments;
- prior-step references limited to already completed steps;
- deterministic SHA-256 configuration hashing.
