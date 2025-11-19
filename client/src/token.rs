
use rand::{Rng, rngs::OsRng};
use sha2::{Sha256, Digest};
use std::fmt::Write;

pub fn generate_key() -> String {
    let mut rng = OsRng;
    let part1: u64 = rng.gen();
    let part2: u64 = rng.gen();

    // Formata as partes em hexadecimal, com preenchimento e maiúsculas
    let mut parte_principal = String::new();
    write!(
        &mut parte_principal,
        "{:016X}{:015X}",
        part1 & 0xFFFFFFFFFFFFF000,
        part2 & 0xFFFFFFFFFFFFFFF0
    ).unwrap();

    let parte_principal = &parte_principal[..28];

    // Hash SHA256
    let mut hasher = Sha256::new();
    hasher.update(parte_principal.as_bytes());
    let hash = hasher.finalize();

    // Pega os 2 primeiros bytes do hash e formata em hexadecimal maiúsculo
    let mut hash_str = String::new();
    for byte in hash.iter().take(2) {
        write!(&mut hash_str, "{:02X}", byte).unwrap();
    }

    return format!("{}{}", parte_principal, hash_str);
}