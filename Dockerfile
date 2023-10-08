FROM --platform=linux/amd64 rust:1.73

WORKDIR /src
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN cargo install sqlx-cli --no-default-features --features rustls,mysql
RUN cargo sqlx prepare --database-url $DATABASE_URL
RUN cargo build --release   
CMD ["./target/release/marketplace"]