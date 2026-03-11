// Sample Rust file for Zaria multi-language fixture.
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// A record of key-value pairs.
pub struct Record {
    pub id: u64,
    pub name: String,
    pub value: f64,
}

/// Trait implemented by all processors.
pub trait Processor {
    fn process(&self, records: Vec<Record>) -> Vec<Record>;
}

/// Trims whitespace from record names.
pub struct TrimProcessor {
    prefix: String,
}

impl TrimProcessor {
    pub fn new(prefix: &str) -> Self {
        TrimProcessor {
            prefix: prefix.to_owned(),
        }
    }
}

impl Processor for TrimProcessor {
    fn process(&self, records: Vec<Record>) -> Vec<Record> {
        records
            .into_iter()
            .map(|mut r| {
                r.name = r.name.trim().to_owned();
                r
            })
            .collect()
    }
}

pub fn load_file(path: &Path) -> Result<String, std::io::Error> {
    fs::read_to_string(path)
}

pub fn write_file(path: &Path, content: &str) -> Result<(), std::io::Error> {
    fs::write(path, content)
}

fn count_words(text: &str) -> HashMap<&str, usize> {
    let mut map = HashMap::new();
    for word in text.split_whitespace() {
        *map.entry(word).or_insert(0) += 1;
    }
    map
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("usage: sample <path>");
        std::process::exit(1);
    }
    let content = load_file(Path::new(&args[1])).unwrap_or_else(|e| {
        eprintln!("{e}");
        std::process::exit(1);
    });
    let counts = count_words(&content);
    println!("{} unique words", counts.len());
}
