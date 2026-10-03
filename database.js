const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error(
        "DATABASE_URL is missing. Add your Supabase PostgreSQL connection string to Render environment variables."
    );
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on("error", error => {
    console.error("[POSTGRES ERROR]", error);
});

/* =========================================================
   MARKET SETTINGS
========================================================= */

const MIN_ASSET_PRICE = 1;

/*
   These are the starting prices.

   IMPORTANT:
   Every asset starts at >= $1.
*/
const defaultAssets = [
    { symbol: "BTC", name: "Bitcoin", type: "crypto", price: 15000 },
    { symbol: "ETH", name: "Ethereum", type: "crypto", price: 900 },
    { symbol: "SOL", name: "Solana", type: "crypto", price: 60 },
    { symbol: "XRP", name: "XRP", type: "crypto", price: 1.25 },
    { symbol: "DOGE", name: "Dogecoin", type: "crypto", price: 1 },
    { symbol: "ADA", name: "Cardano", type: "crypto", price: 1 },
    { symbol: "BNB", name: "BNB", type: "crypto", price: 325 },

    { symbol: "TSLA", name: "Tesla", type: "stock", price: 125 },
    { symbol: "AAPL", name: "Apple", type: "stock", price: 115 },
    { symbol: "NVDA", name: "NVIDIA", type: "stock", price: 90 },
    { symbol: "MSFT", name: "Microsoft", type: "stock", price: 255 },
    { symbol: "AMZN", name: "Amazon", type: "stock", price: 115 },
    { symbol: "META", name: "Meta", type: "stock", price: 375 },
    { symbol: "NFLX", name: "Netflix", type: "stock", price: 600 },
    { symbol: "AMD", name: "AMD", type: "stock", price: 80 }
];

/* =========================================================
   SHOP
========================================================= */

const defaultShop = [
    { item: "motorcycle", price: 85000, category: "Vehicles" },
    { item: "suv", price: 175000, category: "Vehicles" },
    { item: "sportscar", price: 250000, category: "Vehicles" },
    { item: "supercar", price: 750000, category: "Vehicles" },
    { item: "hypercar", price: 1500000, category: "Vehicles" },
    { item: "helicopter", price: 3500000, category: "Vehicles" },
    { item: "privatejet", price: 15000000, category: "Vehicles" },
    { item: "yacht", price: 2500000, category: "Vehicles" },

    { item: "apartment", price: 150000, category: "Properties" },
    { item: "house", price: 500000, category: "Properties" },
    { item: "villa", price: 1200000, category: "Properties" },
    { item: "penthouse", price: 3500000, category: "Properties" },
    { item: "mansion", price: 2500000, category: "Properties" },
    { item: "estate", price: 7500000, category: "Properties" },

    { item: "diamond", price: 250000, category: "Luxury" },
    { item: "luxurywatch", price: 125000, category: "Luxury" },
    { item: "designerbag", price: 75000, category: "Luxury" },
    { item: "goldchain", price: 45000, category: "Luxury" },
    { item: "diamondring", price: 175000, category: "Luxury" },

    { item: "smartphone", price: 2500, category: "Electronics" },
    { item: "console", price: 1500, category: "Electronics" },
    { item: "gamingsetup", price: 8500, category: "Electronics" },
    { item: "gamingpc", price: 12000, category: "Electronics" },
    { item: "laptop", price: 5000, category: "Electronics" },
    { item: "tv", price: 3500, category: "Electronics" },

    { item: "guitar", price: 3500, category: "Lifestyle" },
    { item: "piano", price: 25000, category: "Lifestyle" },
    { item: "artwork", price: 100000, category: "Lifestyle" },
    { item: "privategym", price: 350000, category: "Lifestyle" },
    { item: "racetrack", price: 5000000, category: "Lifestyle" }
];

/* =========================================================
   BUSINESSES
========================================================= */

const defaultBusinesses = [
    {
        slug: "burger-house",
        name: "Burger House",
        icon: "🍔",
        price: 250000,
        income: 2500
    },
    {
        slug: "coffee-shop",
        name: "Coffee Shop",
        icon: "☕",
        price: 150000,
        income: 1500
    },
    {
        slug: "gaming-lounge",
        name: "Gaming Lounge",
        icon: "🎮",
        price: 400000,
        income: 4500
    },
    {
        slug: "fitness-club",
        name: "Fitness Club",
        icon: "🏋️",
        price: 600000,
        income: 6500
    },
    {
        slug: "gas-station",
        name: "Gas Station",
        icon: "⛽",
        price: 750000,
        income: 8000
    },
    {
        slug: "supermarket",
        name: "Supermarket",
        icon: "🛒",
        price: 1000000,
        income: 11000
    },
    {
        slug: "restaurant",
        name: "Luxury Restaurant",
        icon: "🍽️",
        price: 1500000,
        income: 16000
    },
    {
        slug: "cinema",
        name: "Cinema",
        icon: "🎬",
        price: 2000000,
        income: 21000
    },
    {
        slug: "car-dealership",
        name: "Car Dealership",
        icon: "🚗",
        price: 3500000,
        income: 35000
    },
    {
        slug: "hotel",
        name: "Luxury Hotel",
        icon: "🏨",
        price: 5000000,
        income: 50000
    },
    {
        slug: "office-building",
        name: "Office Building",
        icon: "🏢",
        price: 7500000,
        income: 70000
    },
    {
        slug: "factory",
        name: "Factory",
        icon: "🏭",
        price: 10000000,
        income: 95000
    },
    {
        slug: "shopping-mall",
        name: "Shopping Mall",
        icon: "🏬",
        price: 15000000,
        income: 140000
    },
    {
        slug: "bank",
        name: "Private Bank",
        icon: "🏦",
        price: 25000000,
        income: 220000
    },
    {
        slug: "tech-company",
        name: "Tech Company",
        icon: "💻",
        price: 50000000,
        income: 450000
    }
];

/* =========================================================
   DATABASE INIT
========================================================= */

async function initDatabase() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                wallet DOUBLE PRECISION NOT NULL DEFAULT 10000,
                bank DOUBLE PRECISION NOT NULL DEFAULT 0,
                daily_claim BIGINT NOT NULL DEFAULT 0,
                weekly_claim BIGINT NOT NULL DEFAULT 0,
                luck_day TEXT,
                luck_last_claim BIGINT NOT NULL DEFAULT 0
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS assets (
                symbol TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                base_price DOUBLE PRECISION NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                previous_price DOUBLE PRECISION NOT NULL,
                change_percent DOUBLE PRECISION NOT NULL DEFAULT 0
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS market_history (
                id BIGSERIAL PRIMARY KEY,
                symbol TEXT NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                change_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
                timestamp BIGINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS holdings (
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                amount DOUBLE PRECISION NOT NULL DEFAULT 0,
                average_price DOUBLE PRECISION NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, symbol)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id BIGSERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                type TEXT NOT NULL,
                amount DOUBLE PRECISION NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                total DOUBLE PRECISION NOT NULL,
                timestamp BIGINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                user_id TEXT NOT NULL,
                item TEXT NOT NULL,
                amount INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, item)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS shop (
                item TEXT PRIMARY KEY,
                price DOUBLE PRECISION NOT NULL,
                category TEXT NOT NULL DEFAULT 'Other'
            )
        `);

        await client.query(`
            ALTER TABLE shop
            ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other'
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                slug TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '🏢',
                price DOUBLE PRECISION NOT NULL,
                base_income DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_businesses (
                user_id TEXT NOT NULL,
                business_slug TEXT NOT NULL,
                level INTEGER NOT NULL DEFAULT 1,
                stored_income DOUBLE PRECISION NOT NULL DEFAULT 0,
                last_collected BIGINT NOT NULL DEFAULT 0,
                purchased_at BIGINT NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, business_slug)
            )
        `);

        /* =====================================================
           SEED / REPAIR ASSETS

           Existing prices are preserved, EXCEPT:
           - prices below $1 are raised to $1
           - base prices below $1 are raised to $1
        ===================================================== */

        for (const asset of defaultAssets) {
            const safePrice = Math.max(
                MIN_ASSET_PRICE,
                Number(asset.price)
            );

            await client.query(
                `
                INSERT INTO assets (
                    symbol,
                    name,
                    type,
                    base_price,
                    price,
                    previous_price,
                    change_percent
                )
                VALUES ($1, $2, $3, $4, $4, $4, 0)
                ON CONFLICT (symbol)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    base_price = GREATEST(assets.base_price, $5),
                    price = GREATEST(assets.price, $5),
                    previous_price = GREATEST(assets.previous_price, $5)
                `,
                [
                    asset.symbol,
                    asset.name,
                    asset.type,
                    safePrice,
                    MIN_ASSET_PRICE
                ]
            );
        }

        /* Hard repair for ALL existing assets */
        await client.query(
            `
            UPDATE assets
            SET
                base_price = GREATEST(base_price, $1),
                price = GREATEST(price, $1),
                previous_price = GREATEST(previous_price, $1)
            `,
            [MIN_ASSET_PRICE]
        );

        /* Shop */
        for (const item of defaultShop) {
            await client.query(
                `
                INSERT INTO shop (
                    item,
                    price,
                    category
                )
                VALUES ($1, $2, $3)
                ON CONFLICT (item)
                DO UPDATE SET
                    price = EXCLUDED.price,
                    category = EXCLUDED.category
                `,
                [
                    item.item,
                    item.price,
                    item.category
                ]
            );
        }

        /* Businesses */
        for (const business of defaultBusinesses) {
            await client.query(
                `
                INSERT INTO businesses (
                    slug,
                    name,
                    icon,
                    price,
                    base_income
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (slug)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    icon = EXCLUDED.icon,
                    price = EXCLUDED.price,
                    base_income = EXCLUDED.base_income
                `,
                [
                    business.slug,
                    business.name,
                    business.icon,
                    business.price,
                    business.income
                ]
            );
        }

        await client.query("COMMIT");

        console.log("✅ PostgreSQL database initialized.");
        console.log("🛡️ Asset minimum price: $1.00");
        console.log("🏪 Shop loaded.");
        console.log("🏢 Businesses loaded.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("[DATABASE INIT ERROR]", error);
        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   USERS
========================================================= */

async function getOrCreateUser(userId) {
    const result = await pool.query(
        `
        INSERT INTO users (
            user_id,
            wallet,
            bank
        )
        VALUES ($1, 10000, 0)
        ON CONFLICT (user_id)
        DO UPDATE SET
            user_id = EXCLUDED.user_id
        RETURNING *
        `,
        [userId]
    );

    return result.rows[0];
}

/* =========================================================
   WALLET
========================================================= */

async function addWallet(userId, amount) {
    await getOrCreateUser(userId);

    await pool.query(
        `
        UPDATE users
        SET wallet = wallet + $1
        WHERE user_id = $2
        `,
        [amount, userId]
    );

    return true;
}

async function removeWallet(userId, amount) {
    const result = await pool.query(
        `
        UPDATE users
        SET wallet = wallet - $1
        WHERE user_id = $2
          AND wallet >= $1
        RETURNING *
        `,
        [amount, userId]
    );

    return result.rowCount > 0;
}

/* =========================================================
   BANK
========================================================= */

async function deposit(userId, amount) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const result = await client.query(
            `
            UPDATE users
            SET
                wallet = wallet - $1,
                bank = bank + $1
            WHERE user_id = $2
              AND wallet >= $1
            RETURNING *
            `,
            [amount, userId]
        );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't have enough money in your wallet."
            };
        }

        await client.query("COMMIT");

        return { success: true };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function withdraw(userId, amount) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const result = await client.query(
            `
            UPDATE users
            SET
                wallet = wallet + $1,
                bank = bank - $1
            WHERE user_id = $2
              AND bank >= $1
            RETURNING *
            `,
            [amount, userId]
        );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't have enough money in your bank."
            };
        }

        await client.query("COMMIT");

        return { success: true };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   ASSETS
========================================================= */

async function getAllAssets() {
    const result = await pool.query(`
        SELECT *
        FROM assets
        ORDER BY
            CASE
                WHEN LOWER(type) = 'crypto' THEN 0
                ELSE 1
            END,
            symbol
    `);

    return result.rows;
}

async function getAsset(symbol) {
    const result = await pool.query(
        `
        SELECT *
        FROM assets
        WHERE UPPER(symbol) = UPPER($1)
        LIMIT 1
        `,
        [symbol]
    );

    return result.rows[0] || null;
}

/* =========================================================
   MARKET
========================================================= */

/*
   setAssetChange now treats "amount" as a percentage
   movement from the CURRENT price.

   Example:

   ADA = $2.00
   movement = +3%

   New ADA = $2.06

   NOT:
   base price × some huge accumulated percentage.

   This prevents the old 4.2k-style jumps.
*/

async function setAssetChange(symbol, amount) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const assetResult = await client.query(
            `
            SELECT *
            FROM assets
            WHERE UPPER(symbol) = UPPER($1)
            FOR UPDATE
            `,
            [symbol]
        );

        if (!assetResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "Asset not found."
            };
        }

        const asset = assetResult.rows[0];

        const oldPrice = Math.max(
            MIN_ASSET_PRICE,
            Number(asset.price) || MIN_ASSET_PRICE
        );

        /*
           Limit a single update so !set cannot accidentally
           create insane jumps.
        */
        const movement = Math.max(
            -25,
            Math.min(25, Number(amount) || 0)
        );

        let newPrice =
            oldPrice *
            (1 + movement / 100);

        /*
           HARD FLOOR
        */
        newPrice = Math.max(
            MIN_ASSET_PRICE,
            newPrice
        );

        /*
           Keep prices sane and remove floating-point noise.
        */
        newPrice = Number(
            newPrice.toFixed(6)
        );

        /*
           change_percent is now the change from the base price.
           It is DISPLAY information, not what drives the next price.
        */
        const basePrice = Math.max(
            MIN_ASSET_PRICE,
            Number(asset.base_price) || MIN_ASSET_PRICE
        );

        const newChange =
            ((newPrice - basePrice) / basePrice) *
            100;

        await client.query(
            `
            UPDATE assets
            SET
                base_price = GREATEST(base_price, $1),
                previous_price = $2,
                price = $3,
                change_percent = $4
            WHERE symbol = $5
            `,
            [
                MIN_ASSET_PRICE,
                oldPrice,
                newPrice,
                newChange,
                asset.symbol
            ]
        );

        await client.query(
            `
            INSERT INTO market_history (
                symbol,
                price,
                change_percent,
                timestamp,
                created_at
            )
            VALUES ($1, $2, $3, $4, NOW())
            `,
            [
                asset.symbol,
                newPrice,
                newChange,
                Date.now()
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            oldPrice,
            newPrice,
            movement,
            oldChange: Number(asset.change_percent) || 0,
            newChange
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function resetMarket() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `
            UPDATE assets
            SET
                base_price = GREATEST(base_price, $1),
                price = GREATEST(base_price, $1),
                previous_price = GREATEST(base_price, $1),
                change_percent = 0
            `,
            [MIN_ASSET_PRICE]
        );

        await client.query(`
            DELETE FROM market_history
        `);

        await client.query("COMMIT");

        return {
            success: true
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getMarketHistory(symbol, limit = 40) {
    const safeLimit = Math.max(
        1,
        Math.min(100, Number(limit) || 40)
    );

    const result = await pool.query(
        `
        SELECT *
        FROM market_history
        WHERE UPPER(symbol) = UPPER($1)
        ORDER BY timestamp DESC
        LIMIT $2
        `,
        [symbol, safeLimit]
    );

    return result.rows.reverse();
}

/* =========================================================
   PORTFOLIO
========================================================= */

async function getPortfolio(userId) {
    const result = await pool.query(
        `
        SELECT
            h.user_id,
            h.symbol,
            h.amount,
            h.average_price,

            a.name,
            a.type,
            GREATEST(a.price, $2) AS price,
            a.change_percent,

            (h.amount * GREATEST(a.price, $2))
                AS value,

            (h.amount * h.average_price)
                AS invested,

            (
                h.amount *
                (
                    GREATEST(a.price, $2)
                    - h.average_price
                )
            ) AS profit_loss,

            CASE
                WHEN h.average_price > 0
                THEN (
                    (
                        GREATEST(a.price, $2)
                        - h.average_price
                    )
                    / h.average_price
                ) * 100
                ELSE 0
            END AS profit_loss_percent

        FROM holdings h

        JOIN assets a
            ON UPPER(a.symbol) = UPPER(h.symbol)

        WHERE h.user_id = $1
          AND h.amount > 0

        ORDER BY value DESC
        `,
        [
            userId,
            MIN_ASSET_PRICE
        ]
    );

    return result.rows;
}

async function getNetWorth(userId) {
    const user =
        await getOrCreateUser(userId);

    const portfolio =
        await getPortfolio(userId);

    const businesses =
        await getBusinesses(userId);

    const portfolioValue =
        portfolio.reduce(
            (sum, item) =>
                sum + Number(item.value || 0),
            0
        );

    const businessValue =
        businesses.reduce(
            (sum, item) => {
                const level =
                    Number(item.level || 1);

                return (
                    sum +
                    Number(item.price || 0) *
                    level
                );
            },
            0
        );

    return (
        Number(user.wallet || 0) +
        Number(user.bank || 0) +
        portfolioValue +
        businessValue
    );
}

/* =========================================================
   BUY
========================================================= */

async function buyAsset(userId, symbol, amount) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "Invalid amount."
            };
        }

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const assetResult =
            await client.query(
                `
                SELECT *
                FROM assets
                WHERE UPPER(symbol) = UPPER($1)
                FOR UPDATE
                `,
                [symbol]
            );

        if (!assetResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "Asset not found."
            };
        }

        const asset =
            assetResult.rows[0];

        const price =
            Math.max(
                MIN_ASSET_PRICE,
                Number(asset.price)
            );

        const total =
            price *
            numericAmount;

        const userResult =
            await client.query(
                `
                SELECT *
                FROM users
                WHERE user_id = $1
                FOR UPDATE
                `,
                [userId]
            );

        const user =
            userResult.rows[0];

        if (Number(user.wallet) < total) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't have enough money."
            };
        }

        const holdingResult =
            await client.query(
                `
                SELECT *
                FROM holdings
                WHERE user_id = $1
                  AND UPPER(symbol) = UPPER($2)
                FOR UPDATE
                `,
                [userId, symbol]
            );

        if (holdingResult.rowCount) {
            const holding =
                holdingResult.rows[0];

            const oldAmount =
                Number(holding.amount);

            const oldAverage =
                Number(holding.average_price);

            const newAmount =
                oldAmount +
                numericAmount;

            const newAverage =
                (
                    oldAmount * oldAverage +
                    numericAmount * price
                ) / newAmount;

            await client.query(
                `
                UPDATE holdings
                SET
                    amount = $1,
                    average_price = $2
                WHERE user_id = $3
                  AND UPPER(symbol) = UPPER($4)
                `,
                [
                    newAmount,
                    newAverage,
                    userId,
                    symbol
                ]
            );
        } else {
            await client.query(
                `
                INSERT INTO holdings (
                    user_id,
                    symbol,
                    amount,
                    average_price
                )
                VALUES ($1, $2, $3, $4)
                `,
                [
                    userId,
                    asset.symbol,
                    numericAmount,
                    price
                ]
            );
        }

        const newBalance =
            Number(user.wallet) -
            total;

        await client.query(
            `
            UPDATE users
            SET wallet = $1
            WHERE user_id = $2
            `,
            [
                newBalance,
                userId
            ]
        );

        await client.query(
            `
            INSERT INTO transactions (
                user_id,
                symbol,
                type,
                amount,
                price,
                total,
                timestamp,
                created_at
            )
            VALUES (
                $1,
                $2,
                'BUY',
                $3,
                $4,
                $5,
                $6,
                NOW()
            )
            `,
            [
                userId,
                asset.symbol,
                numericAmount,
                price,
                total,
                Date.now()
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            amount: numericAmount,
            price,
            total,
            balance: newBalance
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   SELL
========================================================= */

async function sellAsset(userId, symbol, amount) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "Invalid amount."
            };
        }

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const assetResult =
            await client.query(
                `
                SELECT *
                FROM assets
                WHERE UPPER(symbol) = UPPER($1)
                FOR UPDATE
                `,
                [symbol]
            );

        if (!assetResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "Asset not found."
            };
        }

        const asset =
            assetResult.rows[0];

        const holdingResult =
            await client.query(
                `
                SELECT *
                FROM holdings
                WHERE user_id = $1
                  AND UPPER(symbol) = UPPER($2)
                FOR UPDATE
                `,
                [userId, symbol]
            );

        if (!holdingResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't own this asset."
            };
        }

        const holding =
            holdingResult.rows[0];

        const owned =
            Number(holding.amount);

        if (owned < numericAmount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    `You only own ${owned} ${asset.symbol}.`
            };
        }

        const price =
            Math.max(
                MIN_ASSET_PRICE,
                Number(asset.price)
            );

        /*
           COST BASIS OF WHAT IS BEING SOLD
        */
        const invested =
            numericAmount *
            Number(holding.average_price);

        const total =
            numericAmount *
            price;

        /*
           REALIZED PROFIT / LOSS
        */
        const profitLoss =
            total -
            invested;

        const profitLossPercent =
            invested > 0
                ? (profitLoss / invested) * 100
                : 0;

        const newAmount =
            owned -
            numericAmount;

        if (newAmount <= 0.00000001) {
            await client.query(
                `
                DELETE FROM holdings
                WHERE user_id = $1
                  AND UPPER(symbol) = UPPER($2)
                `,
                [
                    userId,
                    symbol
                ]
            );
        } else {
            await client.query(
                `
                UPDATE holdings
                SET amount = $1
                WHERE user_id = $2
                  AND UPPER(symbol) = UPPER($3)
                `,
                [
                    newAmount,
                    userId,
                    symbol
                ]
            );
        }

        const userResult =
            await client.query(
                `
                SELECT *
                FROM users
                WHERE user_id = $1
                FOR UPDATE
                `,
                [userId]
            );

        const user =
            userResult.rows[0];

        const newBalance =
            Number(user.wallet) +
            total;

        await client.query(
            `
            UPDATE users
            SET wallet = $1
            WHERE user_id = $2
            `,
            [
                newBalance,
                userId
            ]
        );

        await client.query(
            `
            INSERT INTO transactions (
                user_id,
                symbol,
                type,
                amount,
                price,
                total,
                timestamp,
                created_at
            )
            VALUES (
                $1,
                $2,
                'SELL',
                $3,
                $4,
                $5,
                $6,
                NOW()
            )
            `,
            [
                userId,
                asset.symbol,
                numericAmount,
                price,
                total,
                Date.now()
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            amount: numericAmount,
            price,
            total,
            invested,
            profitLoss,
            profitLossPercent,
            balance: newBalance
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   TRANSACTIONS
========================================================= */

async function getTransactions(userId, limit = 10) {
    const result = await pool.query(
        `
        SELECT *
        FROM transactions
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
        `,
        [userId, limit]
    );

    return result.rows;
}

/* =========================================================
   LEADERBOARD
========================================================= */

async function getLeaderboard(limit = 10) {
    const usersResult =
        await pool.query(`
            SELECT *
            FROM users
        `);

    const users = [];

    for (const user of usersResult.rows) {
        const netWorth =
            await getNetWorth(user.user_id);

        users.push({
            user_id: user.user_id,
            wallet: Number(user.wallet),
            bank: Number(user.bank),
            netWorth,
            net_worth: netWorth
        });
    }

    users.sort(
        (a, b) =>
            b.netWorth -
            a.netWorth
    );

    return users.slice(0, limit);
}

/* =========================================================
   DAILY
========================================================= */

async function setDailyClaim(userId) {
    const now = Date.now();
    const day =
        24 * 60 * 60 * 1000;

    const user =
        await getOrCreateUser(userId);

    const last =
        Number(user.daily_claim || 0);

    if (
        last &&
        now - last < day
    ) {
        return {
            success: false,
            next: last + day
        };
    }

    const amount =
        Math.floor(
            Math.random() * 5000
        ) + 500;

    await pool.query(
        `
        UPDATE users
        SET
            wallet = wallet + $1,
            daily_claim = $2
        WHERE user_id = $3
        `,
        [
            amount,
            now,
            userId
        ]
    );

    return {
        success: true,
        amount
    };
}

/* =========================================================
   WEEKLY
========================================================= */

async function setWeeklyClaim(userId) {
    const now = Date.now();
    const week =
        7 * 24 * 60 * 60 * 1000;

    const user =
        await getOrCreateUser(userId);

    const last =
        Number(user.weekly_claim || 0);

    if (
        last &&
        now - last < week
    ) {
        return {
            success: false,
            next: last + week
        };
    }

    const amount =
        Math.floor(
            Math.random() * 25000
        ) + 5000;

    await pool.query(
        `
        UPDATE users
        SET
            wallet = wallet + $1,
            weekly_claim = $2
        WHERE user_id = $3
        `,
        [
            amount,
            now,
            userId
        ]
    );

    return {
        success: true,
        amount
    };
}

/* =========================================================
   LUCK
========================================================= */

async function claimLuck(userId) {
    const now = Date.now();

    const date =
        new Date()
            .toISOString()
            .slice(0, 10);

    const user =
        await getOrCreateUser(userId);

    if (user.luck_day === date) {
        return {
            success: false,
            next: "tomorrow"
        };
    }

    const won =
        Math.random() < 0.5;

    const amount =
        won
            ? Math.floor(
                Math.random() * 10000
            ) + 500
            : 0;

    await pool.query(
        `
        UPDATE users
        SET
            luck_day = $1,
            luck_last_claim = $2,
            wallet = wallet + $3
        WHERE user_id = $4
        `,
        [
            date,
            now,
            amount,
            userId
        ]
    );

    return {
        success: true,
        won,
        amount
    };
}

/* =========================================================
   SHOP
========================================================= */

async function getShopItems() {
    const result =
        await pool.query(`
            SELECT *
            FROM shop
            ORDER BY
                category,
                price ASC
        `);

    return result.rows;
}

async function buyShopItem(userId, item) {
    const client =
        await pool.connect();

    try {
        await client.query("BEGIN");

        const shopResult =
            await client.query(
                `
                SELECT *
                FROM shop
                WHERE LOWER(item) = LOWER($1)
                FOR UPDATE
                `,
                [item]
            );

        if (!shopResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "That item doesn't exist."
            };
        }

        const shopItem =
            shopResult.rows[0];

        const price =
            Number(shopItem.price);

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const userResult =
            await client.query(
                `
                SELECT *
                FROM users
                WHERE user_id = $1
                FOR UPDATE
                `,
                [userId]
            );

        const user =
            userResult.rows[0];

        if (Number(user.wallet) < price) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You don't have enough money."
            };
        }

        await client.query(
            `
            UPDATE users
            SET wallet = wallet - $1
            WHERE user_id = $2
            `,
            [price, userId]
        );

        await client.query(
            `
            INSERT INTO inventory (
                user_id,
                item,
                amount
            )
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, item)
            DO UPDATE SET
                amount =
                    inventory.amount + 1
            `,
            [
                userId,
                shopItem.item
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            price,
            item: shopItem.item,
            category: shopItem.category
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getInventory(userId) {
    const result =
        await pool.query(
            `
            SELECT *
            FROM inventory
            WHERE user_id = $1
              AND amount > 0
            ORDER BY item
            `,
            [userId]
        );

    return result.rows;
}

/* =========================================================
   BUSINESSES
========================================================= */

async function getBusinesses(userId) {
    const result =
        await pool.query(
            `
            SELECT
                b.slug,
                b.name,
                b.icon,
                b.price,
                b.base_income,
                ub.level,
                ub.stored_income,
                ub.last_collected,
                ub.purchased_at,

                (
                    b.base_income *
                    POWER(
                        1.25,
                        GREATEST(
                            ub.level - 1,
                            0
                        )
                    )
                ) AS income_per_hour

            FROM user_businesses ub

            JOIN businesses b
                ON b.slug =
                    ub.business_slug

            WHERE ub.user_id = $1

            ORDER BY b.price DESC
            `,
            [userId]
        );

    return result.rows;
}

async function getAllBusinesses() {
    const result =
        await pool.query(`
            SELECT *
            FROM businesses
            ORDER BY price ASC
        `);

    return result.rows;
}

async function getBusiness(slug) {
    const result =
        await pool.query(
            `
            SELECT *
            FROM businesses
            WHERE LOWER(slug) = LOWER($1)
            LIMIT 1
            `,
            [slug]
        );

    return result.rows[0] || null;
}

async function buyBusiness(userId, slug) {
    const client =
        await pool.connect();

    try {
        await client.query("BEGIN");

        const businessResult =
            await client.query(
                `
                SELECT *
                FROM businesses
                WHERE LOWER(slug) = LOWER($1)
                FOR UPDATE
                `,
                [slug]
            );

        if (!businessResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "That business doesn't exist."
            };
        }

        const business =
            businessResult.rows[0];

        const ownedResult =
            await client.query(
                `
                SELECT *
                FROM user_businesses
                WHERE user_id = $1
                  AND business_slug = $2
                FOR UPDATE
                `,
                [
                    userId,
                    business.slug
                ]
            );

        if (ownedResult.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You already own this business."
            };
        }

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const userResult =
            await client.query(
                `
                SELECT *
                FROM users
                WHERE user_id = $1
                FOR UPDATE
                `,
                [userId]
            );

        const user =
            userResult.rows[0];

        const price =
            Number(business.price);

        if (Number(user.wallet) < price) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You don't have enough money."
            };
        }

        const now = Date.now();

        await client.query(
            `
            UPDATE users
            SET wallet = wallet - $1
            WHERE user_id = $2
            `,
            [price, userId]
        );

        await client.query(
            `
            INSERT INTO user_businesses (
                user_id,
                business_slug,
                level,
                stored_income,
                last_collected,
                purchased_at
            )
            VALUES ($1, $2, 1, 0, $3, $3)
            `,
            [
                userId,
                business.slug,
                now
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            business,
            price
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function calculateBusinessIncome(
    userId,
    businessSlug
) {
    const result =
        await pool.query(
            `
            SELECT
                ub.*,
                b.name,
                b.icon,
                b.price,
                b.base_income

            FROM user_businesses ub

            JOIN businesses b
                ON b.slug =
                    ub.business_slug

            WHERE ub.user_id = $1
              AND ub.business_slug = $2
            `,
            [
                userId,
                businessSlug
            ]
        );

    if (!result.rowCount) {
        return null;
    }

    const business =
        result.rows[0];

    const level =
        Number(business.level || 1);

    const baseIncome =
        Number(
            business.base_income || 0
        );

    const incomePerHour =
        baseIncome *
        Math.pow(
            1.25,
            level - 1
        );

    const now = Date.now();

    const lastCollected =
        Number(
            business.last_collected ||
            now
        );

    const elapsed =
        Math.max(
            0,
            now - lastCollected
        );

    const hours =
        elapsed /
        (60 * 60 * 1000);

    const generated =
        incomePerHour *
        hours;

    return {
        ...business,
        level,
        incomePerHour,
        generated
    };
}

async function collectBusiness(
    userId,
    businessSlug
) {
    const client =
        await pool.connect();

    try {
        await client.query("BEGIN");

        const result =
            await client.query(
                `
                SELECT
                    ub.*,
                    b.name,
                    b.icon,
                    b.price,
                    b.base_income

                FROM user_businesses ub

                JOIN businesses b
                    ON b.slug =
                        ub.business_slug

                WHERE ub.user_id = $1
                  AND LOWER(
                      ub.business_slug
                  ) = LOWER($2)

                FOR UPDATE
                `,
                [
                    userId,
                    businessSlug
                ]
            );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You don't own this business."
            };
        }

        const business =
            result.rows[0];

        const level =
            Number(
                business.level || 1
            );

        const incomePerHour =
            Number(
                business.base_income
            ) *
            Math.pow(
                1.25,
                level - 1
            );

        const now = Date.now();

        const lastCollected =
            Number(
                business.last_collected ||
                now
            );

        const elapsed =
            Math.max(
                0,
                now - lastCollected
            );

        const hours =
            elapsed /
            (60 * 60 * 1000);

        const generated =
            incomePerHour *
            hours;

        if (generated < 0.01) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "Your business hasn't generated enough income yet."
            };
        }

        await client.query(
            `
            UPDATE users
            SET wallet =
                wallet + $1
            WHERE user_id = $2
            `,
            [
                generated,
                userId
            ]
        );

        await client.query(
            `
            UPDATE user_businesses
            SET
                stored_income = 0,
                last_collected = $1
            WHERE user_id = $2
              AND business_slug = $3
            `,
            [
                now,
                userId,
                business.business_slug
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            amount: generated,
            business: business.name,
            icon: business.icon
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function upgradeBusiness(
    userId,
    slug
) {
    const client =
        await pool.connect();

    try {
        await client.query("BEGIN");

        const result =
            await client.query(
                `
                SELECT
                    ub.*,
                    b.name,
                    b.icon,
                    b.price,
                    b.base_income

                FROM user_businesses ub

                JOIN businesses b
                    ON b.slug =
                        ub.business_slug

                WHERE ub.user_id = $1
                  AND LOWER(
                      ub.business_slug
                  ) = LOWER($2)

                FOR UPDATE
                `,
                [
                    userId,
                    slug
                ]
            );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You don't own this business."
            };
        }

        const business =
            result.rows[0];

        const level =
            Number(
                business.level || 1
            );

        const upgradePrice =
            Number(business.price) *
            0.5 *
            Math.pow(
                1.35,
                level - 1
            );

        await client.query(
            `
            INSERT INTO users (
                user_id,
                wallet,
                bank
            )
            VALUES ($1, 10000, 0)
            ON CONFLICT (user_id)
            DO NOTHING
            `,
            [userId]
        );

        const userResult =
            await client.query(
                `
                SELECT *
                FROM users
                WHERE user_id = $1
                FOR UPDATE
                `,
                [userId]
            );

        const user =
            userResult.rows[0];

        if (
            Number(user.wallet) <
            upgradePrice
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You don't have enough money for this upgrade."
            };
        }

        await client.query(
            `
            UPDATE users
            SET wallet =
                wallet - $1
            WHERE user_id = $2
            `,
            [
                upgradePrice,
                userId
            ]
        );

        await client.query(
            `
            UPDATE user_businesses
            SET level = level + 1
            WHERE user_id = $1
              AND business_slug = $2
            `,
            [
                userId,
                business.business_slug
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            name: business.name,
            icon: business.icon,
            oldLevel: level,
            newLevel: level + 1,
            price: upgradePrice
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function sellBusiness(
    userId,
    slug
) {
    const client =
        await pool.connect();

    try {
        await client.query("BEGIN");

        const result =
            await client.query(
                `
                SELECT
                    ub.*,
                    b.name,
                    b.icon,
                    b.price

                FROM user_businesses ub

                JOIN businesses b
                    ON b.slug =
                        ub.business_slug

                WHERE ub.user_id = $1
                  AND LOWER(
                      ub.business_slug
                  ) = LOWER($2)

                FOR UPDATE
                `,
                [
                    userId,
                    slug
                ]
            );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason:
                    "You don't own this business."
            };
        }

        const business =
            result.rows[0];

        const level =
            Number(
                business.level || 1
            );

        const sellValue =
            Number(business.price) *
            0.70 *
            Math.pow(
                1.25,
                level - 1
            );

        await client.query(
            `
            UPDATE users
            SET wallet =
                wallet + $1
            WHERE user_id = $2
            `,
            [
                sellValue,
                userId
            ]
        );

        await client.query(
            `
            DELETE FROM user_businesses
            WHERE user_id = $1
              AND business_slug = $2
            `,
            [
                userId,
                business.business_slug
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            name: business.name,
            icon: business.icon,
            amount: sellValue
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   RESET
========================================================= */

async function resetBalance(userId) {
    await pool.query(
        `
        UPDATE users
        SET
            wallet = 10000,
            bank = 0,
            daily_claim = 0,
            weekly_claim = 0,
            luck_day = NULL,
            luck_last_claim = 0
        WHERE user_id = $1
        `,
        [userId]
    );

    await pool.query(
        `
        DELETE FROM holdings
        WHERE user_id = $1
        `,
        [userId]
    );

    await pool.query(
        `
        DELETE FROM inventory
        WHERE user_id = $1
        `,
        [userId]
    );

    await pool.query(
        `
        DELETE FROM user_businesses
        WHERE user_id = $1
        `,
        [userId]
    );

    return {
        success: true
    };
}

async function resetAll() {
    const client =
        await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            "DELETE FROM transactions"
        );

        await client.query(
            "DELETE FROM holdings"
        );

        await client.query(
            "DELETE FROM inventory"
        );

        await client.query(
            "DELETE FROM user_businesses"
        );

        await client.query(
            "DELETE FROM users"
        );

        await client.query(
            "DELETE FROM market_history"
        );

        await client.query(
            `
            UPDATE assets
            SET
                price = GREATEST(
                    base_price,
                    $1
                ),
                previous_price = GREATEST(
                    base_price,
                    $1
                ),
                change_percent = 0
            `,
            [MIN_ASSET_PRICE]
        );

        await client.query("COMMIT");

        return {
            success: true
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
    initDatabase,

    getOrCreateUser,

    addWallet,
    removeWallet,

    deposit,
    withdraw,

    getAllAssets,
    getAsset,

    setAssetChange,
    resetMarket,
    getMarketHistory,

    getPortfolio,
    getNetWorth,

    buyAsset,
    sellAsset,

    getTransactions,
    getLeaderboard,

    setDailyClaim,
    setWeeklyClaim,
    claimLuck,

    getShopItems,
    buyShopItem,
    getInventory,

    getBusinesses,
    getAllBusinesses,
    getBusiness,
    buyBusiness,
    calculateBusinessIncome,
    collectBusiness,
    upgradeBusiness,
    sellBusiness,

    resetBalance,
    resetAll
};
