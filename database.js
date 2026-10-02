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
   DEFAULT ASSETS
========================================================= */

const defaultAssets = [
    {
        symbol: "BTC",
        name: "Bitcoin",
        type: "crypto",
        price: 15000
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        type: "crypto",
        price: 900
    },
    {
        symbol: "SOL",
        name: "Solana",
        type: "crypto",
        price: 60
    },
    {
        symbol: "XRP",
        name: "XRP",
        type: "crypto",
        price: 1.25
    },
    {
        symbol: "DOGE",
        name: "Dogecoin",
        type: "crypto",
        price: 0.12
    },
    {
        symbol: "ADA",
        name: "Cardano",
        type: "crypto",
        price: 0.35
    },
    {
        symbol: "BNB",
        name: "BNB",
        type: "crypto",
        price: 325
    },

    {
        symbol: "TSLA",
        name: "Tesla",
        type: "stock",
        price: 125
    },
    {
        symbol: "AAPL",
        name: "Apple",
        type: "stock",
        price: 115
    },
    {
        symbol: "NVDA",
        name: "NVIDIA",
        type: "stock",
        price: 90
    },
    {
        symbol: "MSFT",
        name: "Microsoft",
        type: "stock",
        price: 255
    },
    {
        symbol: "AMZN",
        name: "Amazon",
        type: "stock",
        price: 115
    },
    {
        symbol: "META",
        name: "Meta",
        type: "stock",
        price: 375
    },
    {
        symbol: "NFLX",
        name: "Netflix",
        type: "stock",
        price: 600
    },
    {
        symbol: "AMD",
        name: "AMD",
        type: "stock",
        price: 80
    }
];

/* =========================================================
   SHOP
========================================================= */

const defaultShop = [
    {
        item: "yacht",
        price: 2500000
    },
    {
        item: "supercar",
        price: 750000
    },
    {
        item: "sportscar",
        price: 250000
    },
    {
        item: "house",
        price: 500000
    },
    {
        item: "mansion",
        price: 2500000
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
                price DOUBLE PRECISION NOT NULL
            )
        `);

        /* Seed assets */

        for (const asset of defaultAssets) {
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
                    type = EXCLUDED.type
                `,
                [
                    asset.symbol,
                    asset.name,
                    asset.type,
                    asset.price
                ]
            );
        }

        /* Seed shop */

        for (const item of defaultShop) {
            await client.query(
                `
                INSERT INTO shop (
                    item,
                    price
                )
                VALUES ($1, $2)
                ON CONFLICT (item)
                DO UPDATE SET
                    price = EXCLUDED.price
                `,
                [
                    item.item,
                    item.price
                ]
            );
        }

        await client.query("COMMIT");

        console.log("✅ Supabase PostgreSQL database initialized.");
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
        [
            amount,
            userId
        ]
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
        [
            amount,
            userId
        ]
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
            [
                amount,
                userId
            ]
        );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't have enough money in your wallet."
            };
        }

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
            [
                amount,
                userId
            ]
        );

        if (!result.rowCount) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't have enough money in your bank."
            };
        }

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

        const oldChange =
            Number(asset.change_percent) || 0;

        const newChange = Math.max(
            -50,
            Math.min(
                500,
                oldChange + Number(amount)
            )
        );

        const basePrice =
            Number(asset.base_price);

        const oldPrice =
            Number(asset.price);

        const newPrice =
            basePrice *
            (1 + newChange / 100);

        await client.query(
            `
            UPDATE assets
            SET
                previous_price = $1,
                price = $2,
                change_percent = $3
            WHERE symbol = $4
            `,
            [
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
            VALUES (
                $1,
                $2,
                $3,
                $4,
                NOW()
            )
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
            oldChange,
            newChange,
            oldPrice,
            newPrice
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

        await client.query(`
            UPDATE assets
            SET
                price = base_price,
                previous_price = base_price,
                change_percent = 0
        `);

        await client.query(`
            DELETE FROM market_history
        `);

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getMarketHistory(symbol, limit = 40) {
    const result = await pool.query(
        `
        SELECT *
        FROM market_history
        WHERE UPPER(symbol) = UPPER($1)
        ORDER BY timestamp DESC
        LIMIT $2
        `,
        [
            symbol,
            limit
        ]
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
            a.price,
            a.change_percent,
            (h.amount * a.price) AS value
        FROM holdings h
        JOIN assets a
            ON UPPER(a.symbol) = UPPER(h.symbol)
        WHERE h.user_id = $1
          AND h.amount > 0
        ORDER BY value DESC
        `,
        [userId]
    );

    return result.rows;
}

async function getNetWorth(userId) {
    const user = await getOrCreateUser(userId);
    const portfolio = await getPortfolio(userId);

    const portfolioValue = portfolio.reduce(
        (sum, item) =>
            sum + Number(item.value || 0),
        0
    );

    return (
        Number(user.wallet || 0) +
        Number(user.bank || 0) +
        portfolioValue
    );
}

/* =========================================================
   BUY
========================================================= */

async function buyAsset(userId, symbol, amount) {
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

        const price =
            Number(asset.price);

        const total =
            price * Number(amount);

        const userResult = await client.query(
            `
            SELECT *
            FROM users
            WHERE user_id = $1
            FOR UPDATE
            `,
            [userId]
        );

        const user = userResult.rows[0];

        if (
            Number(user.wallet) <
            total
        ) {
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
                [
                    userId,
                    symbol
                ]
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
                Number(amount);

            const newAverage =
                (
                    oldAmount *
                    oldAverage +
                    Number(amount) *
                    price
                ) /
                newAmount;

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
                    amount,
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
                amount,
                price,
                total,
                Date.now()
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            amount: Number(amount),
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

        const holdingResult =
            await client.query(
                `
                SELECT *
                FROM holdings
                WHERE user_id = $1
                  AND UPPER(symbol) = UPPER($2)
                FOR UPDATE
                `,
                [
                    userId,
                    symbol
                ]
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

        if (
            owned <
            Number(amount)
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: `You only own ${owned} ${asset.symbol}.`
            };
        }

        const price =
            Number(asset.price);

        const total =
            price *
            Number(amount);

        const newAmount =
            owned -
            Number(amount);

        if (newAmount <= 0) {
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
                amount,
                price,
                total,
                Date.now()
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            amount: Number(amount),
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
        [
            userId,
            limit
        ]
    );

    return result.rows;
}

/* =========================================================
   LEADERBOARD
========================================================= */

async function getLeaderboard(limit = 10) {
    const usersResult = await pool.query(
        `
        SELECT *
        FROM users
        `
    );

    const users = [];

    for (const user of usersResult.rows) {
        const netWorth =
            await getNetWorth(
                user.user_id
            );

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

    return users.slice(
        0,
        limit
    );
}

/* =========================================================
   DAILY
========================================================= */

async function setDailyClaim(userId) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

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
            next:
                last + day
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
            next:
                last + week
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

    if (
        user.luck_day === date
    ) {
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
    const result = await pool.query(`
        SELECT *
        FROM shop
        ORDER BY price ASC
    `);

    return result.rows;
}

async function buyShopItem(userId, item) {
    const client = await pool.connect();

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
                reason: "That item doesn't exist."
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

        if (
            Number(user.wallet) <
            price
        ) {
            await client.query("ROLLBACK");

            return {
                success: false,
                reason: "You don't have enough money."
            };
        }

        await client.query(
            `
            UPDATE users
            SET wallet = wallet - $1
            WHERE user_id = $2
            `,
            [
                price,
                userId
            ]
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
                amount = inventory.amount + 1
            `,
            [
                userId,
                shopItem.item
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            price
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getInventory(userId) {
    const result = await pool.query(
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
}

async function resetAll() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query("DELETE FROM transactions");
        await client.query("DELETE FROM holdings");
        await client.query("DELETE FROM inventory");
        await client.query("DELETE FROM users");
        await client.query("DELETE FROM market_history");

        await client.query(`
            UPDATE assets
            SET
                price = base_price,
                previous_price = base_price,
                change_percent = 0
        `);

        await client.query("COMMIT");
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

    resetBalance,
    resetAll
};
