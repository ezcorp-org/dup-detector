use criterion::{criterion_group, criterion_main, Criterion};

fn benchmark_placeholder(c: &mut Criterion) {
    c.bench_function("placeholder", |b| {
        b.iter(|| {
            // Will be implemented in Epic 10
            let sum: u64 = (0..1000).sum();
            sum
        })
    });
}

criterion_group!(benches, benchmark_placeholder);
criterion_main!(benches);
