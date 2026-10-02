const Database = require("better-sqlite3");

const db = new Database("market.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ============================================================
// TABLES
// ============================================================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    wallet REAL NOT NULL DEFAULT 10000,
    bank REAL NOT NULL DEFAULT 0,
    daily_claim INTEGER NOT NULL DEFAULT 0,
    weekly_claim INTEGER NOT NULL DEFAULT 0,
    luck_day TEXT,
    luck_last_claim INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    base_price REAL NOT NULL,
    price REAL NOT NULL,
    previous_price REAL NOT NULL,
    change_percent REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS market_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    change_percent REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holdings (
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    average_price REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    symbol TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    item TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, item)
);

CREATE TABLE IF NOT EXISTS shop (
    item TEXT PRIMARY KEY,
    price REAL NOT NULL
);
`);

// ============================================================
// SAFE MIGRATIONS
// ============================================================

function addColumnIfMissing(table, column, definition) {
    try {
        const columns = db.prepare(`PRAGMA table_info(${table})`).all();

        if (!columns.some(col => col.name === column)) {
            db.exec(
                `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
            );
        }
    } catch (error) {
        console.error(
            `Migration error for ${table}.${column}:`,
            error.message
        );
    }
}

addColumnIfMissing("users", "daily_claim", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("users", "weekly_claim", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("users", "luck_day", "TEXT");
addColumnIfMissing("users", "luck_last_claim", "INTEGER NOT NULL DEFAULT 0");

addColumnIfMissing("assets", "previous_price", "REAL NOT NULL DEFAULT 0");
addColumnIfMissing("assets", "change_percent", "REAL NOT NULL DEFAULT 0");

// ============================================================
// ASSETS
// ============================================================

const defaultAssets = [
    // CRYPTO
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

    // STOCKS
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

// ============================================================
// INSERT / UPDATE ASSETS
// ============================================================

const insertAsset = db.prepare(`
    INSERT INTO assets (
        symbol,
        name,
        type,
        base_price,
        price,
        previous_price,
        change_percent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO NOTHING
`);

for (const asset of defaultAssets) {
    insertAsset.run(
        asset.symbol,
        asset.name,
        asset.type,
        asset.price,
        asset.price,
        asset.price,
        0
    );
}

// Update metadata but DON'T reset a market that has already moved.
for (const asset of defaultAssets) {
    const existing = db.prepare(`
        SELECT *
        FROM assets
        WHERE symbol = ?
    `).get(asset.symbol);

    if (!existing) continue;

    const hasNeverMoved =
        Number(existing.change_percent || 0) === 0;

    db.prepare(`
        UPDATE assets
        SET
            name = ?,
            type = ?,
            base_price = ?
        WHERE symbol = ?
    `).run(
        asset.name,
        asset.type,
        asset.price,
        asset.symbol
    );

    // If it was still at 0%, use the new cheaper base price.
    if (hasNeverMoved) {
        db.prepare(`
            UPDATE assets
            SET
                price = ?,
                previous_price = ?
            WHERE symbol = ?
        `).run(
            asset.price,
            asset.price,
            asset.symbol
        );
    }
}

// ============================================================
// SHOP
// ============================================================

const shopItems = [
    ["yacht", 2500000],
    ["supercar", 750000],
    ["sportscar", 250000],
    ["house", 500000],
    ["mansion", 2500000]
];

const insertShop = db.prepare(`
    INSERT INTO shop (item, price)
    VALUES (?, ?)
    ON CONFLICT(item)
    DO UPDATE SET price = excluded.price
`);

for (const [item, price] of shopItems) {
    insertShop.run(item, price);
}

// ============================================================
// USERS
// ============================================================

function getOrCreateUser(userId) {
    let user = db.prepare(`
        SELECT *
        FROM users
        WHERE user_id = ?
    `).get(userId);

    if (!user) {
        db.prepare(`
            INSERT INTO users (
                user_id,
                wallet,
                bank,
                daily_claim,
                weekly_claim,
                luck_last_claim
            )
            VALUES (?, 10000, 0, 0, 0, 0)
        `).run(userId);

        user = db.prepare(`
            SELECT *
            FROM users
            WHERE user_id = ?
        `).get(userId);
    }

    return user;
}

// ============================================================
// WALLET
// ============================================================

function withdraw(userId, amount) {
    getOrCreateUser(userId);

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            success: false,
            reason: "Invalid amount."
        };
    }

    const result = db.prepare(`
        UPDATE users
        SET wallet = wallet - ?
        WHERE user_id = ?
        AND wallet >= ?
    `).run(
        amount,
        userId,
        amount
    );

    if (result.changes === 0) {
        return {
            success: false,
            reason: "You don't have enough money in your wallet."
        };
    }

    return {
        success: true
    };
}

function addWallet(userId, amount) {
    getOrCreateUser(userId);

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return false;
    }

    db.prepare(`
        UPDATE users
        SET wallet = wallet + ?
        WHERE user_id = ?
    `).run(
        amount,
        userId
    );

    return true;
}

// ============================================================
// BANK
// ============================================================

function deposit(userId, amount) {
    getOrCreateUser(userId);

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            success: false,
            reason: "Invalid amount."
        };
    }

    const result = db.prepare(`
        UPDATE users
        SET
            wallet = wallet - ?,
            bank = bank + ?
        WHERE user_id = ?
        AND wallet >= ?
    `).run(
        amount,
        amount,
        userId,
        amount
    );

    if (result.changes === 0) {
        return {
            success: false,
            reason: "You don't have enough money in your wallet."
        };
    }

    return {
        success: true
    };
}

function withdrawBank(userId, amount) {
    getOrCreateUser(userId);

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            success: false,
            reason: "Invalid amount."
        };
    }

    const result = db.prepare(`
        UPDATE users
        SET
            bank = bank - ?,
            wallet = wallet + ?
        WHERE user_id = ?
        AND bank >= ?
    `).run(
        amount,
        amount,
        userId,
        amount
    );

    if (result.changes === 0) {
        return {
            success: false,
            reason: "You don't have enough money in your bank."
        };
    }

    return {
        success: true
    };
}

// ============================================================
// NET WORTH
// ============================================================

function getNetWorth(userId) {
    const user = getOrCreateUser(userId);
    const portfolio = getPortfolio(userId);

    const investments = portfolio.reduce(
        (total, item) => {
            return total +
                Number(item.price || 0) *
                Number(item.amount || 0);
        },
        0
    );

    return (
        Number(user.wallet || 0) +
        Number(user.bank || 0) +
        investments
    );
}

// ============================================================
// PORTFOLIO
// ============================================================

function getPortfolio(userId) {
    getOrCreateUser(userId);

    const rows = db.prepare(`
        SELECT
            h.symbol,
            h.amount,
            h.average_price,
            a.name,
            a.type,
            a.price,
            a.change_percent
        FROM holdings h
        JOIN assets a
            ON a.symbol = h.symbol
        WHERE h.user_id = ?
        AND h.amount > 0
        ORDER BY a.symbol
    `).all(userId);

    return rows.map(row => ({
        ...row,
        value:
            Number(row.price || 0) *
            Number(row.amount || 0)
    }));
}

// ============================================================
// TRANSACTIONS
// ============================================================

function getTransactions(userId, limit = 10) {
    return db.prepare(`
        SELECT *
        FROM transactions
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
    `).all(
        userId,
        Math.max(1, Number(limit))
    );
}

// ============================================================
// LEADERBOARD
// ============================================================

function getLeaderboard(limit = 10) {
    const users = db.prepare(`
        SELECT *
        FROM users
    `).all();

    return users
        .map(user => {
            const netWorth = getNetWorth(user.user_id);

            return {
                user_id: user.user_id,
                netWorth,
                net_worth: netWorth
            };
        })
        .sort(
            (a, b) => b.netWorth - a.netWorth
        )
        .slice(
            0,
            Number(limit)
        );
}

// ============================================================
// DAILY
// ============================================================

function setDailyClaim(userId) {
    const user = getOrCreateUser(userId);

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    const lastClaim =
        Number(user.daily_claim || 0);

    if (
        lastClaim > 0 &&
        now - lastClaim < cooldown
    ) {
        return {
            success: false,
            next: lastClaim + cooldown
        };
    }

    const amount = 2500;

    db.prepare(`
        UPDATE users
        SET
            wallet = wallet + ?,
            daily_claim = ?
        WHERE user_id = ?
    `).run(
        amount,
        now,
        userId
    );

    return {
        success: true,
        amount
    };
}

// ============================================================
// WEEKLY
// ============================================================

function setWeeklyClaim(userId) {
    const user = getOrCreateUser(userId);

    const now = Date.now();
    const cooldown = 7 * 24 * 60 * 60 * 1000;

    const lastClaim =
        Number(user.weekly_claim || 0);

    if (
        lastClaim > 0 &&
        now - lastClaim < cooldown
    ) {
        return {
            success: false,
            next: lastClaim + cooldown
        };
    }

    const amount = 10000;

    db.prepare(`
        UPDATE users
        SET
            wallet = wallet + ?,
            weekly_claim = ?
        WHERE user_id = ?
    `).run(
        amount,
        now,
        userId
    );

    return {
        success: true,
        amount
    };
}

// ============================================================
// LUCK
// ============================================================

function claimLuck(userId) {
    const user = getOrCreateUser(userId);

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    const lastClaim =
        Number(user.luck_last_claim || 0);

    if (
        lastClaim > 0 &&
        now - lastClaim < cooldown
    ) {
        return {
            success: false,
            next: lastClaim + cooldown
        };
    }

    const won = Math.random() < 0.55;

    const amount = won
        ? Math.floor(
            1000 +
            Math.random() * 9000
        )
        : 0;

    db.prepare(`
        UPDATE users
        SET
            wallet = wallet + ?,
            luck_last_claim = ?
        WHERE user_id = ?
    `).run(
        amount,
        now,
        userId
    );

    return {
        success: true,
        won,
        amount
    };
}

// ============================================================
// SHOP
// ============================================================

function getShopItems() {
    return db.prepare(`
        SELECT *
        FROM shop
        ORDER BY price ASC
    `).all();
}

function getShopItem(item) {
    return db.prepare(`
        SELECT *
        FROM shop
        WHERE LOWER(item) = LOWER(?)
    `).get(item);
}

// ============================================================
// INVENTORY
// ============================================================

function addInventoryItem(
    userId,
    item,
    amount = 1
) {
    getOrCreateUser(userId);

    db.prepare(`
        INSERT INTO inventory (
            user_id,
            item,
            amount
        )
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, item)
        DO UPDATE SET
            amount = amount + excluded.amount
    `).run(
        userId,
        item,
        Number(amount)
    );

    return true;
}

function getInventory(userId) {
    return db.prepare(`
        SELECT *
        FROM inventory
        WHERE user_id = ?
        AND amount > 0
        ORDER BY item
    `).all(userId);
}

// ============================================================
// RESET BALANCES
// ============================================================

function resetAllBalances(amount = 10000) {
    amount = Number(amount);

    db.prepare(`
        UPDATE users
        SET
            wallet = ?,
            bank = 0
    `).run(amount);
}

function resetBalance(
    userId,
    amount = 10000
) {
    getOrCreateUser(userId);

    db.prepare(`
        UPDATE users
        SET
            wallet = ?,
            bank = 0
        WHERE user_id = ?
    `).run(
        Number(amount),
        userId
    );
}

// ============================================================
// MARKET
// ============================================================

function getAllAssets() {
    return db.prepare(`
        SELECT *
        FROM assets
        ORDER BY
            CASE
                WHEN type = 'crypto' THEN 0
                ELSE 1
            END,
            symbol
    `).all();
}

function getAsset(symbol) {
    return db.prepare(`
        SELECT *
        FROM assets
        WHERE symbol = ?
    `).get(
        String(symbol)
            .trim()
            .toUpperCase()
    );
}

// ============================================================
// MARKET MOVEMENT
// ============================================================

function setAssetChange(
    symbol,
    changeAmount
) {
    symbol = String(symbol)
        .trim()
        .toUpperCase();

    const asset = getAsset(symbol);

    if (!asset) {
        return {
            success: false,
            reason: "Asset not found."
        };
    }

    const amount = Number(changeAmount);

    if (!Number.isFinite(amount)) {
        return {
            success: false,
            reason: "Invalid market movement."
        };
    }

    const oldChange =
        Number(asset.change_percent || 0);

    const newChange =
        Math.max(
            -50,
            Math.min(
                500,
                oldChange + amount
            )
        );

    const oldPrice =
        Number(asset.price);

    const basePrice =
        Number(asset.base_price);

    const newPrice =
        basePrice *
        (1 + newChange / 100);

    const timestamp = Date.now();

    try {
        const transaction = db.transaction(() => {

            db.prepare(`
                UPDATE assets
                SET
                    previous_price = ?,
                    price = ?,
                    change_percent = ?
                WHERE symbol = ?
            `).run(
                oldPrice,
                newPrice,
                newChange,
                symbol
            );

            db.prepare(`
                INSERT INTO market_history (
                    symbol,
                    price,
                    change_percent,
                    timestamp,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(
                symbol,
                newPrice,
                newChange,
                timestamp,
                new Date().toISOString()
            );
        });

        transaction();

    } catch (error) {
        console.error(
            `Market update failed for ${symbol}:`,
            error
        );

        return {
            success: false,
            reason: error.message
        };
    }

    return {
        success: true,
        oldChange,
        newChange,
        oldPrice,
        newPrice
    };
}

const moveAsset = setAssetChange;

// ============================================================
// RESET MARKET
// ============================================================

function resetMarket() {
    const transaction = db.transaction(() => {

        db.prepare(`
            UPDATE assets
            SET
                previous_price = base_price,
                price = base_price,
                change_percent = 0
        `).run();

        db.prepare(`
            DELETE FROM market_history
        `).run();
    });

    transaction();
}

// ============================================================
// MARKET HISTORY
// ============================================================

function getMarketHistory(
    symbol,
    limit = 30
) {
    symbol = String(symbol)
        .trim()
        .toUpperCase();

    return db.prepare(`
        SELECT *
        FROM market_history
        WHERE symbol = ?
        ORDER BY id DESC
        LIMIT ?
    `).all(
        symbol,
        Math.max(1, Number(limit))
    ).reverse();
}

// ============================================================
// BUY
// ============================================================

function buyAsset(
    userId,
    symbol,
    amount
) {
    symbol = String(symbol)
        .trim()
        .toUpperCase();

    amount = Number(amount);

    const asset = getAsset(symbol);

    if (!asset) {
        return {
            success: false,
            reason: "Asset not found."
        };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            success: false,
            reason: "Amount must be greater than zero."
        };
    }

    const user = getOrCreateUser(userId);

    const price = Number(asset.price);
    const total = price * amount;

    if (!Number.isFinite(total) || total <= 0) {
        return {
            success: false,
            reason: "Invalid purchase total."
        };
    }

    if (Number(user.wallet) < total) {
        return {
            success: false,
            reason: "You don't have enough money."
        };
    }

    const existing = db.prepare(`
        SELECT *
        FROM holdings
        WHERE user_id = ?
        AND symbol = ?
    `).get(
        userId,
        symbol
    );

    const oldAmount =
        Number(existing?.amount || 0);

    const oldAverage =
        Number(existing?.average_price || 0);

    const newAmount =
        oldAmount + amount;

    const newAverage =
        (
            oldAmount * oldAverage +
            amount * price
        ) / newAmount;

    try {
        const transaction = db.transaction(() => {

            db.prepare(`
                UPDATE users
                SET wallet = wallet - ?
                WHERE user_id = ?
                AND wallet >= ?
            `).run(
                total,
                userId,
                total
            );

            db.prepare(`
                INSERT INTO holdings (
                    user_id,
                    symbol,
                    amount,
                    average_price
                )
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, symbol)
                DO UPDATE SET
                    amount = excluded.amount,
                    average_price = excluded.average_price
            `).run(
                userId,
                symbol,
                newAmount,
                newAverage
            );

            db.prepare(`
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                symbol,
                "BUY",
                amount,
                price,
                total,
                Date.now(),
                new Date().toISOString()
            );
        });

        transaction();

    } catch (error) {
        console.error(
            "BUY DATABASE ERROR:",
            error
        );

        return {
            success: false,
            reason: error.message
        };
    }

    return {
        success: true,
        amount,
        price,
        total,
        balance: getOrCreateUser(userId).wallet
    };
}

// ============================================================
// SELL
// ============================================================

function sellAsset(
    userId,
    symbol,
    amount
) {
    symbol = String(symbol)
        .trim()
        .toUpperCase();

    amount = Number(amount);

    const asset = getAsset(symbol);

    if (!asset) {
        return {
            success: false,
            reason: "Asset not found."
        };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            success: false,
            reason: "Amount must be greater than zero."
        };
    }

    const holding = db.prepare(`
        SELECT *
        FROM holdings
        WHERE user_id = ?
        AND symbol = ?
    `).get(
        userId,
        symbol
    );

    if (!holding) {
        return {
            success: false,
            reason: `You don't own any ${symbol}.`
        };
    }

    const owned =
        Number(holding.amount || 0);

    if (amount > owned) {
        return {
            success: false,
            reason: `You only own ${owned} ${symbol}.`
        };
    }

    const price = Number(asset.price);
    const total = price * amount;

    const remaining =
        owned - amount;

    try {
        const transaction = db.transaction(() => {

            db.prepare(`
                UPDATE users
                SET wallet = wallet + ?
                WHERE user_id = ?
            `).run(
                total,
                userId
            );

            if (remaining <= 0) {

                db.prepare(`
                    DELETE FROM holdings
                    WHERE user_id = ?
                    AND symbol = ?
                `).run(
                    userId,
                    symbol
                );

            } else {

                db.prepare(`
                    UPDATE holdings
                    SET amount = ?
                    WHERE user_id = ?
                    AND symbol = ?
                `).run(
                    remaining,
                    userId,
                    symbol
                );
            }

            db.prepare(`
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                symbol,
                "SELL",
                amount,
                price,
                total,
                Date.now(),
                new Date().toISOString()
            );
        });

        transaction();

    } catch (error) {
        console.error(
            "SELL DATABASE ERROR:",
            error
        );

        return {
            success: false,
            reason: error.message
        };
    }

    return {
        success: true,
        amount,
        price,
        total,
        balance: getOrCreateUser(userId).wallet
    };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    db,

    getOrCreateUser,

    withdraw,
    addWallet,

    deposit,
    withdrawBank,

    getNetWorth,

    getPortfolio,
    getTransactions,
    getLeaderboard,

    setDailyClaim,
    setWeeklyClaim,
    claimLuck,

    getShopItems,
    getShopItem,

    addInventoryItem,
    getInventory,

    resetAllBalances,
    resetBalance,

    getAllAssets,
    getAsset,

    setAssetChange,
    moveAsset,

    getMarketHistory,
    resetMarket,

    buyAsset,
    sellAsset
};