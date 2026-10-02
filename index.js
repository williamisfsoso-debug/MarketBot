require("dotenv").config();

const http = require("http");

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const db = require("./database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = "!";
const CURRENCY = "🪙";

const OWNERS = [
    "1410867769729351772",
    "1300582883873787960"
];

const CO_OWNER = "1388444379743785071";
const PORT = Number(process.env.PORT) || 10000;

const ASSET_ICONS = {
    BTC: "₿",
    ETH: "Ξ",
    SOL: "◎",
    XRP: "✕",
    DOGE: "Ð",
    ADA: "₳",
    BNB: "◆",
    TSLA: "⚡",
    AAPL: "",
    NVDA: "◈",
    MSFT: "▦",
    AMZN: "A",
    META: "∞",
    NFLX: "N",
    AMD: "◉"
};

const SHOP_ICONS = {
    motorcycle: "🏍️",
    suv: "🚙",
    sportscar: "🏎️",
    supercar: "🚗",
    hypercar: "🏎️",
    helicopter: "🚁",
    privatejet: "✈️",
    yacht: "🛥️",

    apartment: "🏢",
    house: "🏠",
    villa: "🏡",
    penthouse: "🌆",
    mansion: "🏰",
    estate: "🏯",

    diamond: "💎",
    luxurywatch: "⌚",
    designerbag: "👜",
    goldchain: "📿",
    diamondring: "💍",

    smartphone: "📱",
    console: "🎮",
    gamingsetup: "🖥️",
    gamingpc: "💻",
    laptop: "💻",
    tv: "📺",

    guitar: "🎸",
    piano: "🎹",
    artwork: "🖼️",
    privategym: "🏋️",
    racetrack: "🏁"
};

/* =========================================================
   RENDER
========================================================= */

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("MarketBot is online!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web server listening on port ${PORT}`);
});

/* =========================================================
   HELPERS
========================================================= */

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function money(value) {
    return num(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatAmount(value) {
    return num(value).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
    });
}

function formatPrice(value) {
    const n = num(value);

    if (n >= 1_000_000_000) {
        return `$${(n / 1_000_000_000).toFixed(2)}B`;
    }

    if (n >= 1_000_000) {
        return `$${(n / 1_000_000).toFixed(2)}M`;
    }

    if (n >= 1_000) {
        return `$${n.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    if (n >= 1) {
        return `$${n.toFixed(2)}`;
    }

    return `$${n.toFixed(4)}`;
}

function percent(value) {
    const n = num(value);

    if (n > 0) return `+${n.toFixed(2)}%`;

    return `${n.toFixed(2)}%`;
}

function cleanSymbol(value) {
    return String(value || "").trim().toUpperCase();
}

function assetIcon(symbol) {
    return ASSET_ICONS[cleanSymbol(symbol)] || "◆";
}

function shopIcon(item) {
    return SHOP_ICONS[String(item || "").toLowerCase()] || "📦";
}

function parseAmount(value) {
    if (!value) return NaN;

    return Number(
        String(value)
            .replace(/,/g, "")
            .replace(/\$/g, "")
            .trim()
    );
}

function isOwner(id) {
    return OWNERS.includes(id);
}

function isStaff(id) {
    return isOwner(id) || id === CO_OWNER;
}

function directionIcon(change) {
    const n = num(change);

    if (n > 0) return "🟢";
    if (n < 0) return "🔴";

    return "⚪";
}

function directionArrow(change) {
    const n = num(change);

    if (n > 0) return "▲";
    if (n < 0) return "▼";

    return "━";
}

function findAsset(symbol) {
    return db.getAsset(cleanSymbol(symbol));
}

function makeGraph(history) {
    if (!history || history.length < 2) {
        return "▁▁▁▁▁▁▁▁▁▁";
    }

    const bars = "▁▂▃▄▅▆▇█";

    const values = history
        .map(x => num(x.price))
        .slice(-24);

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
        return "▄".repeat(values.length);
    }

    return values.map(value => {
        const ratio =
            (value - min) /
            (max - min);

        const index = Math.max(
            0,
            Math.min(
                bars.length - 1,
                Math.round(
                    ratio * (bars.length - 1)
                )
            )
        );

        return bars[index];
    }).join("");
}

function timeLeft(timestamp) {
    const difference =
        Math.max(
            0,
            Number(timestamp) - Date.now()
        );

    const seconds =
        Math.floor(difference / 1000);

    const hours =
        Math.floor(seconds / 3600);

    const minutes =
        Math.floor((seconds % 3600) / 60);

    const secs =
        seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
}

function businessSlug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
}

/* =========================================================
   MARKET
========================================================= */

async function createMarketEmbed() {
    const assets = await db.getAllAssets();

    const crypto = assets.filter(
        a => String(a.type).toLowerCase() === "crypto"
    );

    const stocks = assets.filter(
        a => String(a.type).toLowerCase() === "stock"
    );

    const lines = list => {
        if (!list.length) {
            return "No assets available.";
        }

        return list.map(asset => {
            const change =
                num(asset.change_percent);

            return (
                `${assetIcon(asset.symbol)} **${asset.symbol}** \`${asset.name}\`\n` +
                `> **${formatPrice(asset.price)}**  ` +
                `${directionIcon(change)} ${directionArrow(change)} **${percent(change)}**`
            );
        }).join("\n\n");
    };

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📊  MARKET")
        .setDescription(
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "**LIVE VIRTUAL MARKET**\n" +
            "Prices update every 30 seconds.\n" +
            "━━━━━━━━━━━━━━━━━━━━"
        )
        .addFields(
            {
                name: "₿  CRYPTO",
                value: lines(crypto),
                inline: false
            },
            {
                name: "📈  STOCKS",
                value: lines(stocks),
                inline: false
            }
        )
        .setFooter({
            text: "MarketBot • Virtual Economy"
        })
        .setTimestamp();
}

/* =========================================================
   BALANCE
========================================================= */

async function createBalanceEmbed(userId, user) {
    const account =
        await db.getOrCreateUser(userId);

    const portfolio =
        await db.getPortfolio(userId);

    const businesses =
        await db.getBusinesses(userId);

    const investments =
        portfolio.reduce(
            (total, item) =>
                total + num(item.value),
            0
        );

    const businessValue =
        businesses.reduce(
            (total, business) =>
                total +
                num(business.price) *
                num(business.level || 1),
            0
        );

    const wallet = num(account.wallet);
    const bank = num(account.bank);

    const netWorth =
        wallet +
        bank +
        investments +
        businessValue;

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
            name:
                `${user.username}'s Financial Overview`,
            iconURL:
                user.displayAvatarURL()
        })
        .setTitle("💰  BALANCE")
        .setDescription(
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "Your complete virtual financial overview.\n" +
            "━━━━━━━━━━━━━━━━━━━━"
        )
        .addFields(
            {
                name: "🪙  Wallet",
                value: `**${money(wallet)}**`,
                inline: true
            },
            {
                name: "🏦  Bank",
                value: `**${money(bank)}**`,
                inline: true
            },
            {
                name: "📈  Investments",
                value: `**${money(investments)}**`,
                inline: true
            },
            {
                name: "🏢  Businesses",
                value: `**${money(businessValue)}**`,
                inline: true
            },
            {
                name: "💎  NET WORTH",
                value:
                    `\`\`\`fix\n` +
                    `${CURRENCY} ${money(netWorth)}\n` +
                    `\`\`\``,
                inline: false
            }
        )
        .setFooter({
            text:
                "MarketBot • Virtual Economy"
        })
        .setTimestamp();
}

/* =========================================================
   PORTFOLIO
========================================================= */

async function createPortfolioEmbed(userId) {
    const portfolio =
        await db.getPortfolio(userId);

    if (!portfolio.length) {
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📊  PORTFOLIO")
            .setDescription(
                "Your portfolio is currently empty.\n\n" +
                "Use `!buy BTC 1` to start investing."
            )
            .setFooter({
                text:
                    "MarketBot • Virtual Investments"
            })
            .setTimestamp();
    }

    const totalValue =
        portfolio.reduce(
            (sum, item) =>
                sum + num(item.value),
            0
        );

    const lines =
        portfolio.map(item => {
            const symbol =
                cleanSymbol(item.symbol);

            const amount =
                num(item.amount);

            const current =
                num(item.price);

            const average =
                num(item.average_price);

            const value =
                num(item.value);

            const profit =
                (current - average) *
                amount;

            return (
                `${assetIcon(symbol)} **${symbol}**\n` +
                `> Amount: **${formatAmount(amount)}**\n` +
                `> Value: **${formatPrice(value)}**\n` +
                `> P/L: ${directionIcon(profit)} **${formatPrice(profit)}**`
            );
        });

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📊  PORTFOLIO")
        .setDescription(
            lines.join("\n\n")
        )
        .addFields({
            name:
                "💎 Total Portfolio Value",
            value:
                `**${formatPrice(totalValue)}**`,
            inline: false
        })
        .setFooter({
            text:
                "MarketBot • Virtual Investments"
        })
        .setTimestamp();
}

/* =========================================================
   INFO
========================================================= */

async function createInfoEmbed(symbol) {
    const asset =
        await findAsset(symbol);

    if (!asset) return null;

    const history =
        await db.getMarketHistory(
            asset.symbol,
            40
        );

    const prices =
        history.map(x => num(x.price));

    const high =
        prices.length
            ? Math.max(...prices)
            : num(asset.price);

    const low =
        prices.length
            ? Math.min(...prices)
            : num(asset.price);

    const change =
        num(asset.change_percent);

    return new EmbedBuilder()
        .setColor(
            change > 0
                ? 0x57F287
                : change < 0
                    ? 0xED4245
                    : 0x5865F2
        )
        .setTitle(
            `${assetIcon(asset.symbol)}  ${asset.symbol} • ${asset.name}`
        )
        .setDescription(
            `**${formatPrice(asset.price)}**\n` +
            `${directionIcon(change)} **${percent(change)}**\n\n` +
            `\`${makeGraph(history)}\``
        )
        .addFields(
            {
                name: "💵 Price",
                value:
                    `**${formatPrice(asset.price)}**`,
                inline: true
            },
            {
                name: "📈 Change",
                value:
                    `${directionIcon(change)} **${percent(change)}**`,
                inline: true
            },
            {
                name: "🏷️ Type",
                value:
                    `**${String(asset.type).toUpperCase()}**`,
                inline: true
            },
            {
                name: "🔺 High",
                value:
                    `**${formatPrice(high)}**`,
                inline: true
            },
            {
                name: "🔻 Low",
                value:
                    `**${formatPrice(low)}**`,
                inline: true
            },
            {
                name: "📌 Base",
                value:
                    `**${formatPrice(asset.base_price)}**`,
                inline: true
            }
        )
        .setFooter({
            text:
                "MarketBot • Asset Information"
        })
        .setTimestamp();
}

/* =========================================================
   HISTORY
========================================================= */

async function createHistoryEmbed(symbol) {
    const asset =
        await findAsset(symbol);

    if (!asset) return null;

    const history =
        await db.getMarketHistory(
            asset.symbol,
            40
        );

    if (!history.length) {
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                `${assetIcon(asset.symbol)} ${asset.symbol} • History`
            )
            .setDescription(
                "Not enough history yet."
            )
            .setTimestamp();
    }

    const prices =
        history.map(x => num(x.price));

    const first =
        prices[0];

    const current =
        prices[prices.length - 1];

    const high =
        Math.max(...prices);

    const low =
        Math.min(...prices);

    const movement =
        first !== 0
            ? ((current - first) / first) * 100
            : 0;

    return new EmbedBuilder()
        .setColor(
            movement > 0
                ? 0x57F287
                : movement < 0
                    ? 0xED4245
                    : 0x5865F2
        )
        .setTitle(
            `${assetIcon(asset.symbol)}  ${asset.symbol} • HISTORY`
        )
        .setDescription(
            `\`${makeGraph(history)}\`\n\n` +
            `${directionIcon(movement)} **${percent(movement)}**`
        )
        .addFields(
            {
                name: "💵 Current",
                value:
                    `**${formatPrice(current)}**`,
                inline: true
            },
            {
                name: "🔺 High",
                value:
                    `**${formatPrice(high)}**`,
                inline: true
            },
            {
                name: "🔻 Low",
                value:
                    `**${formatPrice(low)}**`,
                inline: true
            }
        )
        .setFooter({
            text:
                "MarketBot • Price History"
        })
        .setTimestamp();
}

/* =========================================================
   SHOP
========================================================= */

async function createShopEmbed() {
    const items =
        await db.getShopItems();

    if (!items.length) {
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🛒 SHOP")
            .setDescription(
                "The shop is empty."
            );
    }

    const categories = {};

    for (const item of items) {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }

        categories[item.category].push(item);
    }

    const embeds = [];

    const categoryOrder = [
        "Vehicles",
        "Properties",
        "Luxury",
        "Electronics",
        "Lifestyle"
    ];

    for (const category of categoryOrder) {
        const list = categories[category];

        if (!list || !list.length) continue;

        const lines = list.map(item =>
            `${shopIcon(item.item)} **${item.item}**\n` +
            `> ${CURRENCY} **${money(item.price)}**`
        );

        embeds.push({
            name: `━━ ${category.toUpperCase()} ━━`,
            value: lines.join("\n\n"),
            inline: false
        });
    }

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🛒  MARKETBOT SHOP")
        .setDescription(
            "Buy virtual items and build your collection.\n\n" +
            "Use `!shop buy <item>` to purchase."
        )
        .addFields(embeds)
        .setFooter({
            text:
                `${items.length} items available • Virtual Economy`
        })
        .setTimestamp();
}

/* =========================================================
   BUSINESSES
========================================================= */

async function createBusinessEmbed(userId) {
    const owned =
        await db.getBusinesses(userId);

    const all =
        await db.getAllBusinesses();

    const lines = all.map(business => {
        const ownedBusiness =
            owned.find(
                x =>
                    x.slug === business.slug
            );

        if (ownedBusiness) {
            const level =
                Number(ownedBusiness.level);

            const income =
                Number(
                    ownedBusiness.income_per_hour
                );

            return (
                `${business.icon} **${business.name}**  •  **OWNED**\n` +
                `> Level **${level}** • ${CURRENCY} **${money(income)}/hr**`
            );
        }

        return (
            `${business.icon} **${business.name}**\n` +
            `> Buy: ${CURRENCY} **${money(business.price)}** • ` +
            `Income: **${money(business.base_income)}/hr**`
        );
    });

    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🏢  BUSINESS EMPIRE")
        .setDescription(
            "Buy businesses and generate passive virtual income.\n\n" +
            lines.join("\n\n")
        )
        .addFields({
            name: "📋 Commands",
            value:
                "`!business buy <business>`\n" +
                "`!business collect [business]`\n" +
                "`!business upgrade <business>`\n" +
                "`!business sell <business>`",
            inline: false
        })
        .setFooter({
            text:
                "MarketBot • Virtual Businesses"
        })
        .setTimestamp();
}

async function createOwnedBusinessEmbed(userId) {
    const businesses =
        await db.getBusinesses(userId);

    if (!businesses.length) {
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🏢  YOUR BUSINESSES")
            .setDescription(
                "You don't own any businesses yet.\n\n" +
                "Use `!business` to view available businesses."
            )
            .setTimestamp();
    }

    const lines =
        businesses.map(business => {
            const level =
                Number(business.level);

            const income =
                Number(business.income_per_hour);

            const generated =
                Number(
                    business.generated || 0
                );

            return (
                `${business.icon} **${business.name}**\n` +
                `> Level: **${level}**\n` +
                `> Income: **${money(income)}/hr**\n` +
                `> Available: **${money(generated)}** ${CURRENCY}`
            );
        });

    const value =
        businesses.reduce(
            (sum, business) =>
                sum +
                num(business.price) *
                num(business.level || 1),
            0
        );

    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🏢  YOUR BUSINESS EMPIRE")
        .setDescription(
            lines.join("\n\n")
        )
        .addFields({
            name: "🏦 Business Value",
            value:
                `**${money(value)}** ${CURRENCY}`,
            inline: false
        })
        .setFooter({
            text:
                "Use !business collect to collect income"
        })
        .setTimestamp();
}

/* =========================================================
   HELP
========================================================= */

function createHelpEmbed() {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📖  MARKETBOT")
        .setDescription(
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "**COMMAND CENTER**\n" +
            "━━━━━━━━━━━━━━━━━━━━"
        )
        .addFields(
            {
                name: "💰 FINANCES",
                value:
                    "`!balance` — Balance + net worth\n" +
                    "`!deposit <amount>` — Deposit\n" +
                    "`!withdraw <amount>` — Withdraw\n" +
                    "`!portfolio` — Investments",
                inline: false
            },
            {
                name: "📈 MARKET",
                value:
                    "`!market` — Live market\n" +
                    "`!info <asset>` — Asset details\n" +
                    "`!history <asset>` — Price history",
                inline: false
            },
            {
                name: "💱 TRADING",
                value:
                    "`!buy <asset> <amount|all>` — Buy\n" +
                    "`!sell <asset> <amount|all>` — Sell",
                inline: false
            },
            {
                name: "🏢 BUSINESSES",
                value:
                    "`!business` — Business empire\n" +
                    "`!business buy <business>` — Buy\n" +
                    "`!business collect [business]` — Collect\n" +
                    "`!business upgrade <business>` — Upgrade\n" +
                    "`!business sell <business>` — Sell",
                inline: false
            },
            {
                name: "🎁 REWARDS",
                value:
                    "`!daily` — Daily reward\n" +
                    "`!weekly` — Weekly reward\n" +
                    "`!luck` — Luck",
                inline: false
            },
            {
                name: "🛒 SHOP",
                value:
                    "`!shop` — View shop\n" +
                    "`!shop buy <item>` — Purchase\n" +
                    "`!inventory` — Inventory",
                inline: false
            },
            {
                name: "🏆 OTHER",
                value:
                    "`!leaderboard` — Leaderboard\n" +
                    "`!transactions` — Transactions\n" +
                    "`!ping` — Latency",
                inline: false
            }
        )
        .setFooter({
            text:
                "MarketBot • Virtual Economy"
        });
}

/* =========================================================
   MARKET ENGINE
========================================================= */

let marketUpdating = false;

async function updateMarket() {
    if (marketUpdating) return;

    marketUpdating = true;

    try {
        const assets =
            await db.getAllAssets();

        let updated = 0;

        for (const asset of assets) {
            const movement =
                (Math.random() * 3.5 + 0.5) *
                (Math.random() < 0.5
                    ? -1
                    : 1);

            try {
                const result =
                    await db.setAssetChange(
                        asset.symbol,
                        movement
                    );

                if (result?.success) {
                    updated++;

                    console.log(
                        `[MARKET] ${asset.symbol}: ` +
                        `${percent(result.oldChange)} -> ` +
                        `${percent(result.newChange)}`
                    );
                }
            } catch (error) {
                console.error(
                    `[MARKET] ${asset.symbol} failed:`,
                    error?.stack || error
                );
            }
        }

        console.log(
            `[MARKET] Updated ${updated} assets.`
        );
    } catch (error) {
        console.error(
            "[MARKET] Update failed:",
            error?.stack || error
        );
    } finally {
        marketUpdating = false;
    }
}

/* =========================================================
   MESSAGE HANDLER
========================================================= */

client.on(
    "messageCreate",
    async message => {
        if (message.author.bot) return;

        if (!message.content.startsWith(PREFIX)) {
            return;
        }

        const content =
            message.content
                .slice(PREFIX.length)
                .trim();

        if (!content) return;

        const args =
            content.split(/\s+/);

        const command =
            args.shift().toLowerCase();

        try {

            /* MARKET */

            if (command === "market") {
                return message.reply({
                    embeds: [
                        await createMarketEmbed()
                    ]
                });
            }

            if (command === "info") {
                const symbol =
                    cleanSymbol(args[0]);

                if (!symbol) {
                    return message.reply(
                        "❌ Usage: `!info <asset>`"
                    );
                }

                const embed =
                    await createInfoEmbed(
                        symbol
                    );

                if (!embed) {
                    return message.reply(
                        `❌ Asset \`${symbol}\` was not found.`
                    );
                }

                return message.reply({
                    embeds: [embed]
                });
            }

            if (command === "history") {
                const symbol =
                    cleanSymbol(args[0]);

                if (!symbol) {
                    return message.reply(
                        "❌ Usage: `!history <asset>`"
                    );
                }

                const embed =
                    await createHistoryEmbed(
                        symbol
                    );

                if (!embed) {
                    return message.reply(
                        `❌ Asset \`${symbol}\` was not found.`
                    );
                }

                return message.reply({
                    embeds: [embed]
                });
            }

            /* BALANCE */

            if (
                command === "balance" ||
                command === "bal"
            ) {
                return message.reply({
                    embeds: [
                        await createBalanceEmbed(
                            message.author.id,
                            message.author
                        )
                    ]
                });
            }

            /* PORTFOLIO */

            if (
                command === "portfolio" ||
                command === "pf" ||
                command === "port"
            ) {
                return message.reply({
                    embeds: [
                        await createPortfolioEmbed(
                            message.author.id
                        )
                    ]
                });
            }

            /* DEPOSIT */

            if (
                command === "deposit" ||
                command === "dep"
            ) {
                const amount =
                    parseAmount(args[0]);

                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Enter a valid amount."
                    );
                }

                const result =
                    await db.deposit(
                        message.author.id,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Deposit failed."}`
                    );
                }

                return message.reply(
                    `🏦 Deposited **${money(amount)}** ${CURRENCY}.`
                );
            }

            /* WITHDRAW */

            if (
                command === "withdraw" ||
                command === "with"
            ) {
                const amount =
                    parseAmount(args[0]);

                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Enter a valid amount."
                    );
                }

                const result =
                    await db.withdraw(
                        message.author.id,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Withdrawal failed."}`
                    );
                }

                return message.reply(
                    `💵 Withdrew **${money(amount)}** ${CURRENCY}.`
                );
            }

            /* BUY */

            if (command === "buy") {
                const symbol =
                    cleanSymbol(args[0]);

                const requested =
                    String(args[1] || "");

                if (!symbol || !requested) {
                    return message.reply(
                        "❌ Usage: `!buy <asset> <amount|all>`"
                    );
                }

                const asset =
                    await findAsset(symbol);

                if (!asset) {
                    return message.reply(
                        `❌ Asset \`${symbol}\` was not found.`
                    );
                }

                const user =
                    await db.getOrCreateUser(
                        message.author.id
                    );

                let amount;

                if (
                    requested.toLowerCase() ===
                    "all"
                ) {
                    amount =
                        Math.floor(
                            num(user.wallet) /
                            num(asset.price)
                        );
                } else {
                    amount =
                        parseAmount(
                            requested
                        );
                }

                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {
                    return message.reply(
                        `❌ You cannot buy that amount of ${symbol}.`
                    );
                }

                const result =
                    await db.buyAsset(
                        message.author.id,
                        symbol,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Purchase failed."}`
                    );
                }

                return message.reply(
                    `🟢 Bought **${formatAmount(amount)} ${symbol}**\n` +
                    `💸 Cost: **${formatPrice(result.total)}** ${CURRENCY}\n` +
                    `💰 Wallet: **${formatPrice(result.balance)}** ${CURRENCY}`
                );
            }

            /* SELL */

            if (command === "sell") {
                const symbol =
                    cleanSymbol(args[0]);

                const requested =
                    String(args[1] || "");

                if (!symbol || !requested) {
                    return message.reply(
                        "❌ Usage: `!sell <asset> <amount|all>`"
                    );
                }

                const asset =
                    await findAsset(symbol);

                if (!asset) {
                    return message.reply(
                        `❌ Asset \`${symbol}\` was not found.`
                    );
                }

                let amount;

                if (
                    requested.toLowerCase() ===
                    "all"
                ) {
                    const portfolio =
                        await db.getPortfolio(
                            message.author.id
                        );

                    const holding =
                        portfolio.find(
                            item =>
                                cleanSymbol(
                                    item.symbol
                                ) === symbol
                        );

                    amount =
                        holding
                            ? num(holding.amount)
                            : 0;
                } else {
                    amount =
                        parseAmount(
                            requested
                        );
                }

                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {
                    return message.reply(
                        `❌ You don't have enough ${symbol}.`
                    );
                }

                const result =
                    await db.sellAsset(
                        message.author.id,
                        symbol,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Sale failed."}`
                    );
                }

                return message.reply(
                    `🔴 Sold **${formatAmount(amount)} ${symbol}**\n` +
                    `💵 Received: **${formatPrice(result.total)}** ${CURRENCY}\n` +
                    `💰 Wallet: **${formatPrice(result.balance)}** ${CURRENCY}`
                );
            }

            /* SHOP */

            if (command === "shop") {
                const sub =
                    String(args[0] || "")
                        .toLowerCase();

                if (
                    sub === "buy" ||
                    sub === "purchase"
                ) {
                    const item =
                        args
                            .slice(1)
                            .join(" ")
                            .trim()
                            .toLowerCase();

                    if (!item) {
                        return message.reply(
                            "❌ Usage: `!shop buy <item>`"
                        );
                    }

                    const result =
                        await db.buyShopItem(
                            message.author.id,
                            item
                        );

                    if (!result.success) {
                        return message.reply(
                            `❌ ${result.reason || "Purchase failed."}`
                        );
                    }

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle("🛒 PURCHASE COMPLETE")
                                .setDescription(
                                    `${shopIcon(result.item)} **${result.item}**\n\n` +
                                    `💸 Paid: **${money(result.price)}** ${CURRENCY}\n` +
                                    `📦 Added to your inventory.`
                                )
                                .setFooter({
                                    text:
                                        "MarketBot • Virtual Shop"
                                })
                                .setTimestamp()
                        ]
                    });
                }

                return message.reply({
                    embeds: [
                        await createShopEmbed()
                    ]
                });
            }

            /* INVENTORY */

            if (
                command === "inventory" ||
                command === "inv"
            ) {
                const inventory =
                    await db.getInventory(
                        message.author.id
                    );

                if (!inventory.length) {
                    return message.reply(
                        "🎒 Your inventory is empty."
                    );
                }

                const lines =
                    inventory.map(item =>
                        `${shopIcon(item.item)} **${item.item}** × **${item.amount}**`
                    );

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle(
                                "🎒  INVENTORY"
                            )
                            .setDescription(
                                lines.join("\n")
                            )
                            .setFooter({
                                text:
                                    "MarketBot • Collection"
                            })
                            .setTimestamp()
                    ]
                });
            }

            /* BUSINESSES */

            if (
                command === "business" ||
                command === "businesses" ||
                command === "biz"
            ) {
                const sub =
                    String(args[0] || "")
                        .toLowerCase();

                if (!sub) {
                    return message.reply({
                        embeds: [
                            await createBusinessEmbed(
                                message.author.id
                            )
                        ]
                    });
                }

                /* BUY BUSINESS */

                if (sub === "buy") {
                    const requested =
                        args
                            .slice(1)
                            .join(" ")
                            .trim();

                    if (!requested) {
                        return message.reply(
                            "❌ Usage: `!business buy <business>`"
                        );
                    }

                    const slug =
                        businessSlug(
                            requested
                        );

                    const result =
                        await db.buyBusiness(
                            message.author.id,
                            slug
                        );

                    if (!result.success) {
                        return message.reply(
                            `❌ ${result.reason}`
                        );
                    }

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle(
                                    "🏢 BUSINESS ACQUIRED"
                                )
                                .setDescription(
                                    `${result.business.icon} **${result.business.name}**\n\n` +
                                    `💸 Purchase: **${money(result.price)}** ${CURRENCY}\n` +
                                    `💰 Income: **${money(result.business.base_income)}/hour**\n` +
                                    `⭐ Level: **1**`
                                )
                                .setFooter({
                                    text:
                                        "Your business is now generating virtual income."
                                })
                                .setTimestamp()
                        ]
                    });
                }

                /* COLLECT */

                if (sub === "collect") {
                    const requested =
                        args
                            .slice(1)
                            .join(" ")
                            .trim();

                    const owned =
                        await db.getBusinesses(
                            message.author.id
                        );

                    if (!owned.length) {
                        return message.reply(
                            "❌ You don't own any businesses."
                        );
                    }

                    if (requested) {
                        const slug =
                            businessSlug(
                                requested
                            );

                        const result =
                            await db.collectBusiness(
                                message.author.id,
                                slug
                            );

                        if (!result.success) {
                            return message.reply(
                                `❌ ${result.reason}`
                            );
                        }

                        return message.reply(
                            `${result.icon} **${result.business}** generated ` +
                            `**${money(result.amount)}** ${CURRENCY}.\n` +
                            `💰 The money has been added to your wallet.`
                        );
                    }

                    let total = 0;
                    let collected = 0;

                    for (const business of owned) {
                        const result =
                            await db.collectBusiness(
                                message.author.id,
                                business.slug
                            );

                        if (
                            result.success
                        ) {
                            total +=
                                num(result.amount);

                            collected++;
                        }
                    }

                    if (collected === 0) {
                        return message.reply(
                            "⏳ Your businesses haven't generated enough income yet."
                        );
                    }

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle(
                                    "💰 BUSINESS INCOME COLLECTED"
                                )
                                .setDescription(
                                    `🏢 Businesses collected: **${collected}**\n\n` +
                                    `💵 Total income: **${money(total)}** ${CURRENCY}`
                                )
                                .setFooter({
                                    text:
                                        "Income added to your wallet."
                                })
                                .setTimestamp()
                        ]
                    });
                }

                /* UPGRADE */

                if (sub === "upgrade") {
                    const requested =
                        args
                            .slice(1)
                            .join(" ")
                            .trim();

                    if (!requested) {
                        return message.reply(
                            "❌ Usage: `!business upgrade <business>`"
                        );
                    }

                    const result =
                        await db.upgradeBusiness(
                            message.author.id,
                            businessSlug(
                                requested
                            )
                        );

                    if (!result.success) {
                        return message.reply(
                            `❌ ${result.reason}`
                        );
                    }

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xFEE75C)
                                .setTitle(
                                    "⬆️ BUSINESS UPGRADED"
                                )
                                .setDescription(
                                    `${result.icon} **${result.name}**\n\n` +
                                    `⭐ Level: **${result.oldLevel} → ${result.newLevel}**\n` +
                                    `💸 Upgrade: **${money(result.price)}** ${CURRENCY}\n\n` +
                                    `📈 Your business now earns more income.`
                                )
                                .setTimestamp()
                        ]
                    });
                }

                /* SELL */

                if (sub === "sell") {
                    const requested =
                        args
                            .slice(1)
                            .join(" ")
                            .trim();

                    if (!requested) {
                        return message.reply(
                            "❌ Usage: `!business sell <business>`"
                        );
                    }

                    const result =
                        await db.sellBusiness(
                            message.author.id,
                            businessSlug(
                                requested
                            )
                        );

                    if (!result.success) {
                        return message.reply(
                            `❌ ${result.reason}`
                        );
                    }

                    return message.reply(
                        `${result.icon} Sold **${result.name}** for ` +
                        `**${money(result.amount)}** ${CURRENCY}.`
                    );
                }

                /* MY BUSINESSES */

                if (
                    sub === "mine" ||
                    sub === "owned" ||
                    sub === "my"
                ) {
                    return message.reply({
                        embeds: [
                            await createOwnedBusinessEmbed(
                                message.author.id
                            )
                        ]
                    });
                }

                return message.reply(
                    "❌ Unknown business command.\n" +
                    "Use `!business` to see the available commands."
                );
            }

            /* TRANSACTIONS */

            if (
                command === "transactions" ||
                command === "tx"
            ) {
                const transactions =
                    await db.getTransactions(
                        message.author.id,
                        10
                    );

                if (!transactions.length) {
                    return message.reply(
                        "📜 No transactions yet."
                    );
                }

                const lines =
                    transactions.map(tx =>
                        `**${String(tx.type).toUpperCase()}** • ${cleanSymbol(tx.symbol)}\n` +
                        `> ${formatAmount(tx.amount)} × ${formatPrice(tx.price)} = **${formatPrice(tx.total)}**`
                    );

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle(
                                "📜  TRANSACTIONS"
                            )
                            .setDescription(
                                lines.join("\n\n")
                            )
                            .setTimestamp()
                    ]
                });
            }

            /* LEADERBOARD */

            if (
                command === "leaderboard" ||
                command === "lb"
            ) {
                const leaderboard =
                    await db.getLeaderboard(10);

                if (!leaderboard.length) {
                    return message.reply(
                        "🏆 No leaderboard data yet."
                    );
                }

                const lines =
                    leaderboard.map(
                        (entry, index) => {
                            const worth =
                                entry.netWorth ??
                                entry.net_worth ??
                                0;

                            return (
                                `**${index + 1}.** <@${entry.user_id}> ` +
                                `— **${money(worth)}** ${CURRENCY}`
                            );
                        }
                    );

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFEE75C)
                            .setTitle(
                                "🏆  NET WORTH LEADERBOARD"
                            )
                            .setDescription(
                                lines.join("\n")
                            )
                            .setFooter({
                                text:
                                    "Businesses + investments + cash included"
                            })
                            .setTimestamp()
                    ]
                });
            }

            /* DAILY */

            if (command === "daily") {
                const result =
                    await db.setDailyClaim(
                        message.author.id
                    );

                if (!result.success) {
                    return message.reply(
                        `⏳ Daily already claimed.\n` +
                        `Try again in **${timeLeft(result.next)}**.`
                    );
                }

                return message.reply(
                    `🎁 Daily reward: **${money(result.amount || 1000)}** ${CURRENCY}!`
                );
            }

            /* WEEKLY */

            if (command === "weekly") {
                const result =
                    await db.setWeeklyClaim(
                        message.author.id
                    );

                if (!result.success) {
                    return message.reply(
                        `⏳ Weekly already claimed.\n` +
                        `Try again in **${timeLeft(result.next)}**.`
                    );
                }

                return message.reply(
                    `🎁 Weekly reward: **${money(result.amount || 10000)}** ${CURRENCY}!`
                );
            }

            /* LUCK */

            if (command === "luck") {
                const result =
                    await db.claimLuck(
                        message.author.id
                    );

                if (!result.success) {
                    return message.reply(
                        `⏳ Luck already used today.\n` +
                        `Try again **${result.next || "tomorrow"}**.`
                    );
                }

                if (result.won) {
                    return message.reply(
                        `🍀 **LUCKY!** You won **${money(result.amount || 0)}** ${CURRENCY}!`
                    );
                }

                return message.reply(
                    "🍀 You didn't win this time. Try again tomorrow!"
                );
            }

            /* GIVE */

            if (command === "give") {
                if (
                    !isStaff(
                        message.author.id
                    )
                ) {
                    return message.reply(
                        "❌ You don't have permission."
                    );
                }

                const target =
                    message.mentions.users.first();

                const amount =
                    parseAmount(
                        args[target ? 1 : 0]
                    );

                if (
                    !target ||
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Usage: `!give @user <amount>`"
                    );
                }

                await db.getOrCreateUser(
                    target.id
                );

                const success =
                    await db.addWallet(
                        target.id,
                        amount
                    );

                if (!success) {
                    return message.reply(
                        "❌ Failed to give money."
                    );
                }

                return message.reply(
                    `💸 Gave **${money(amount)}** ${CURRENCY} to ${target}.`
                );
            }

            /* PING */

            if (command === "ping") {
                const sent =
                    await message.reply(
                        "🏓 Checking..."
                    );

                const latency =
                    sent.createdTimestamp -
                    message.createdTimestamp;

                return sent.edit(
                    `🏓 **Pong!**\n` +
                    `Discord: **${latency}ms**\n` +
                    `API: **${client.ws.ping}ms**`
                );
            }

            /* HELP */

            if (command === "help") {
                return message.reply({
                    embeds: [
                        createHelpEmbed()
                    ]
                });
            }

            /* OWNER */

            if (command === "owner") {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle(
                                "👑  MARKETBOT OWNER"
                            )
                            .setDescription(
                                `**Owners**\n` +
                                `${OWNERS.map(
                                    id => `<@${id}>`
                                ).join("\n")}\n\n` +
                                `**Co-owner**\n` +
                                `<@${CO_OWNER}>`
                            )
                            .setTimestamp()
                    ]
                });
            }

            /* OWNER COMMANDS */

            if (command === "ownercmds") {
                if (
                    !isOwner(
                        message.author.id
                    )
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setTitle(
                                "👑  OWNER COMMANDS"
                            )
                            .setDescription(
                                "`!set <asset> <change>`\n" +
                                "`!resetmarket`\n" +
                                "`!give @user <amount>`\n" +
                                "`!resetbalance @user`\n" +
                                "`!resetall`"
                            )
                            .setTimestamp()
                    ]
                });
            }

            /* SET */

            if (command === "set") {
                if (
                    !isOwner(
                        message.author.id
                    )
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                const symbol =
                    cleanSymbol(args[0]);

                const targetChange =
                    parseAmount(args[1]);

                if (
                    !symbol ||
                    !Number.isFinite(
                        targetChange
                    )
                ) {
                    return message.reply(
                        "❌ Usage: `!set <asset> <change>`"
                    );
                }

                const asset =
                    await findAsset(symbol);

                if (!asset) {
                    return message.reply(
                        `❌ Asset \`${symbol}\` not found.`
                    );
                }

                const difference =
                    targetChange -
                    num(
                        asset.change_percent
                    );

                const result =
                    await db.setAssetChange(
                        symbol,
                        difference
                    );

                if (!result.success) {
                    return message.reply(
                        "❌ Failed to change market."
                    );
                }

                return message.reply(
                    `📊 **${symbol}** changed to **${percent(result.newChange)}**.`
                );
            }

            /* RESET MARKET */

            if (command === "resetmarket") {
                if (
                    !isOwner(
                        message.author.id
                    )
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                const result =
                    await db.resetMarket();

                if (!result.success) {
                    return message.reply(
                        "❌ Failed to reset market."
                    );
                }

                return message.reply(
                    "🔄 Market reset successfully."
                );
            }

            /* RESET BALANCE */

            if (command === "resetbalance") {
                if (
                    !isOwner(
                        message.author.id
                    )
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                const target =
                    message.mentions.users.first();

                if (!target) {
                    return message.reply(
                        "❌ Usage: `!resetbalance @user`"
                    );
                }

                const result =
                    await db.resetBalance(
                        target.id
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Failed to reset balance."}`
                    );
                }

                return message.reply(
                    `🔄 Reset ${target}'s balance, investments, inventory and businesses.`
                );
            }

            /* RESET ALL */

            if (command === "resetall") {
                if (
                    !isOwner(
                        message.author.id
                    )
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                const result =
                    await db.resetAll();

                if (!result.success) {
                    return message.reply(
                        "❌ Failed to reset economy."
                    );
                }

                return message.reply(
                    "⚠️ **Entire virtual economy reset successfully.**"
                );
            }

        } catch (error) {
            console.error(
                "\n=========================================="
            );

            console.error(
                "COMMAND ERROR"
            );

            console.error(
                "User:",
                message.author.tag
            );

            console.error(
                "Command:",
                message.content
            );

            console.error(
                error?.stack || error
            );

            console.error(
                "==========================================\n"
            );

            try {
                await message.reply(
                    "❌ Something went wrong while executing that command."
                );
            } catch {}
        }
    }
);

/* =========================================================
   READY
========================================================= */

client.once(
    "clientReady",
    async () => {
        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            "📈 Market engine started."
        );

        await updateMarket();

        setInterval(
            updateMarket,
            30 * 1000
        );
    }
);

/* =========================================================
   START
========================================================= */

async function startBot() {
    try {
        if (!process.env.TOKEN) {
            throw new Error(
                "TOKEN is missing."
            );
        }

        if (!process.env.DATABASE_URL) {
            throw new Error(
                "DATABASE_URL is missing."
            );
        }

        console.log(
            "🔄 Initializing Supabase database..."
        );

        await db.initDatabase();

        console.log(
            "✅ Database ready."
        );

        await client.login(
            process.env.TOKEN
        );
    } catch (error) {
        console.error(
            "\n=========================================="
        );

        console.error(
            "BOT STARTUP FAILED"
        );

        console.error(
            error?.stack || error
        );

        console.error(
            "==========================================\n"
        );

        process.exit(1);
    }
}

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "UNHANDLED REJECTION:",
            error?.stack || error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "UNCAUGHT EXCEPTION:",
            error?.stack || error
        );
    }
);

startBot();
