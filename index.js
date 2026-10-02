require("dotenv").config();

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

/* =========================================================
   HELPERS
========================================================= */

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function money(value) {
    return `$${num(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatAmount(value) {
    return num(value).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function percent(value) {
    const n = num(value);
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function cleanSymbol(symbol) {
    return String(symbol || "").trim().toUpperCase();
}

function assetIcon(symbol) {
    return ASSET_ICONS[cleanSymbol(symbol)] || "◆";
}

function findAsset(symbol) {
    return db.getAsset(cleanSymbol(symbol));
}

function isOwner(id) {
    return OWNERS.includes(id);
}

function isCoOwner(id) {
    return id === CO_OWNER;
}

function isStaff(id) {
    return isOwner(id) || isCoOwner(id);
}

function directionIcon(change) {
    const n = num(change);

    if (n > 0.005) return "🟢";
    if (n < -0.005) return "🔴";
    return "🟡";
}

function directionArrow(change) {
    const n = num(change);

    if (n > 0.005) return "▲";
    if (n < -0.005) return "▼";
    return "—";
}

function directionWord(change) {
    const n = num(change);

    if (n > 0.005) return "RISING";
    if (n < -0.005) return "FALLING";
    return "UNCHANGED";
}

function trend(change) {
    const n = num(change);

    if (n >= 10) return "🚀 Strong bullish";
    if (n > 2) return "📈 Bullish";
    if (n > 0) return "↗️ Slightly bullish";
    if (n <= -10) return "💥 Strong bearish";
    if (n < -2) return "📉 Bearish";
    if (n < 0) return "↘️ Slightly bearish";

    return "⏸️ Flat";
}

function recentMove(change) {
    const n = num(change);

    if (n > 5) return "🔥 Heavy buying pressure";
    if (n > 1) return "📈 Buyers pushing price up";
    if (n > 0) return "↗️ Small upward movement";
    if (n < -5) return "⚠️ Heavy selling pressure";
    if (n < -1) return "📉 Sellers pushing price down";
    if (n < 0) return "↘️ Small downward movement";

    return "⏸️ Little movement";
}

function profitEmoji(value) {
    const n = num(value);

    if (n > 0) return "🟢";
    if (n < 0) return "🔴";
    return "🟡";
}

/* =========================================================
   GRAPH
========================================================= */

function makeGraph(history) {
    if (!history || history.length < 2) {
        return "`No history yet`";
    }

    const bars = [
        "▁",
        "▂",
        "▃",
        "▄",
        "▅",
        "▆",
        "▇",
        "█"
    ];

    let values = history
        .map(x => num(x.price))
        .filter(x => Number.isFinite(x));

    if (values.length < 2) {
        return "`No history yet`";
    }

    const maxBars = 24;

    if (values.length > maxBars) {
        const step =
            (values.length - 1) /
            (maxBars - 1);

        const reduced = [];

        for (let i = 0; i < maxBars; i++) {
            reduced.push(
                values[
                    Math.round(i * step)
                ]
            );
        }

        values = reduced;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (max === min) {
        return `\`${bars[3].repeat(values.length)}\``;
    }

    const graph = values
        .map(value => {
            const normalized =
                (value - min) /
                (max - min);

            const index = Math.round(
                normalized *
                (bars.length - 1)
            );

            return bars[index];
        })
        .join("");

    return `\`${graph}\``;
}

/* =========================================================
   MARKET
========================================================= */

function createMarketEmbed() {
    const assets =
        db.getAllAssets() || [];

    const crypto =
        assets.filter(
            x =>
                String(x.type)
                    .toLowerCase() ===
                "crypto"
        );

    const stocks =
        assets.filter(
            x =>
                String(x.type)
                    .toLowerCase() ===
                "stock"
        );

    function buildList(list) {
        if (!list.length) {
            return "No assets available.";
        }

        return list
            .map(asset => {
                const change =
                    num(asset.change_percent);

                return (
                    `${assetIcon(asset.symbol)} **${asset.symbol}**\n` +
                    `> ${money(asset.price)}  ` +
                    `${directionIcon(change)} **${percent(change)}** ${directionArrow(change)}`
                );
            })
            .join("\n\n");
    }

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📊 MARKETBOT EXCHANGE")
        .setDescription(
            "### Live Virtual Market\n" +
            "Prices update automatically.\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        .addFields(
            {
                name: "🪙 CRYPTO",
                value: buildList(crypto),
                inline: true
            },
            {
                name: "📈 STOCKS",
                value: buildList(stocks),
                inline: true
            },
            {
                name: "MARKET KEY",
                value:
                    "🟢 Rising  🔴 Falling  🟡 Unchanged\n" +
                    "All prices are part of the virtual Discord economy.",
                inline: false
            }
        )
        .setFooter({
            text: "MarketBot • Virtual economy"
        })
        .setTimestamp();
}

/* =========================================================
   INFO
========================================================= */

function createInfoEmbed(symbol) {
    const asset =
        findAsset(symbol);

    if (!asset) {
        return new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("❌ ASSET NOT FOUND")
            .setDescription(
                `I couldn't find **${cleanSymbol(symbol)}**.\n\n` +
                "Use `!market` to see available assets."
            );
    }

    const history =
        db.getMarketHistory(
            asset.symbol,
            40
        ) || [];

    const price =
        num(asset.price);

    const base =
        num(asset.base_price);

    const change =
        num(asset.change_percent);

    const difference =
        price - base;

    const prices =
        history.length
            ? history.map(
                x => num(x.price)
            )
            : [price];

    const high =
        Math.max(...prices);

    const low =
        Math.min(...prices);

    return new EmbedBuilder()
        .setColor(
            change >= 0
                ? 0x57F287
                : 0xED4245
        )
        .setTitle(
            `${assetIcon(asset.symbol)} ${asset.symbol} MARKET`
        )
        .setDescription(
            `**${asset.name}**\n\n` +
            `# ${money(price)}\n` +
            `${directionIcon(change)} **${percent(change)}** ` +
            `${directionArrow(change)} **${directionWord(change)}**\n\n` +
            `${makeGraph(history)}`
        )
        .addFields(
            {
                name: "📊 TREND",
                value: trend(change),
                inline: true
            },
            {
                name: "💵 BASE",
                value: money(base),
                inline: true
            },
            {
                name: "💰 CHANGE",
                value:
                    `${difference >= 0 ? "+" : "-"}${money(Math.abs(difference))}`,
                inline: true
            },
            {
                name: "📈 HIGH",
                value: money(high),
                inline: true
            },
            {
                name: "📉 LOW",
                value: money(low),
                inline: true
            },
            {
                name: "⚡ MOVEMENT",
                value: recentMove(change),
                inline: true
            }
        )
        .setFooter({
            text:
                `MarketBot • ${asset.symbol} • Live virtual market`
        })
        .setTimestamp();
}

/* =========================================================
   HISTORY
========================================================= */

function createHistoryEmbed(symbol) {
    const asset =
        findAsset(symbol);

    if (!asset) {
        return new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("❌ ASSET NOT FOUND")
            .setDescription(
                `I couldn't find **${cleanSymbol(symbol)}**.`
            );
    }

    const history =
        db.getMarketHistory(
            asset.symbol,
            40
        ) || [];

    if (history.length < 2) {
        return new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle(
                `${assetIcon(asset.symbol)} ${asset.symbol} HISTORY`
            )
            .setDescription(
                "Not enough history yet."
            );
    }

    const prices =
        history.map(
            x => num(x.price)
        );

    const first =
        prices[0];

    const current =
        prices[prices.length - 1];

    const high =
        Math.max(...prices);

    const low =
        Math.min(...prices);

    const movement =
        first > 0
            ? ((current - first) / first) * 100
            : 0;

    return new EmbedBuilder()
        .setColor(
            movement >= 0
                ? 0x57F287
                : 0xED4245
        )
        .setTitle(
            `${assetIcon(asset.symbol)} ${asset.symbol} PRICE HISTORY`
        )
        .setDescription(
            `**${asset.name}**\n\n` +
            `${makeGraph(history)}\n\n` +
            `${directionIcon(movement)} **${percent(movement)}** over displayed history`
        )
        .addFields(
            {
                name: "START",
                value: money(first),
                inline: true
            },
            {
                name: "CURRENT",
                value: money(current),
                inline: true
            },
            {
                name: "HIGH",
                value: money(high),
                inline: true
            },
            {
                name: "LOW",
                value: money(low),
                inline: true
            },
            {
                name: "MOVEMENT",
                value: percent(movement),
                inline: true
            },
            {
                name: "DATA POINTS",
                value: String(history.length),
                inline: true
            }
        )
        .setFooter({
            text:
                `MarketBot • ${asset.symbol}`
        })
        .setTimestamp();
}

/* =========================================================
   BALANCE
========================================================= */

function createBalanceEmbed(
    userId,
    user
) {
    const wallet =
        num(user.wallet);

    const bank =
        num(user.bank);

    const portfolio =
        db.getPortfolio(userId) || [];

    const portfolioValue =
        portfolio.reduce(
            (sum, item) =>
                sum + num(item.value),
            0
        );

    const netWorth =
        wallet +
        bank +
        portfolioValue;

    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("💳 YOUR FINANCES")
        .setDescription(
            `Financial overview for <@${userId}>`
        )
        .addFields(
            {
                name: "👛 WALLET",
                value:
                    `${CURRENCY} **${money(wallet)}**`,
                inline: true
            },
            {
                name: "🏦 BANK",
                value:
                    `${CURRENCY} **${money(bank)}**`,
                inline: true
            },
            {
                name: "📈 INVESTMENTS",
                value:
                    `${CURRENCY} **${money(portfolioValue)}**`,
                inline: true
            },
            {
                name: "💎 NET WORTH",
                value:
                    `${CURRENCY} **${money(netWorth)}**`,
                inline: false
            }
        )
        .setFooter({
            text:
                "MarketBot • Virtual economy"
        })
        .setTimestamp();
}

/* =========================================================
   PORTFOLIO
========================================================= */

function createPortfolioEmbed(
    userId
) {
    const portfolio =
        db.getPortfolio(userId) || [];

    if (!portfolio.length) {
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                "📈 YOUR PORTFOLIO"
            )
            .setDescription(
                "You don't own any assets yet.\n\n" +
                "Try `!buy BTC 1`."
            );
    }

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const embed =
        new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                "📈 YOUR PORTFOLIO"
            )
            .setDescription(
                `Investment overview for <@${userId}>\n` +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            );

    for (const item of portfolio) {
        const amount =
            num(item.amount);

        const averagePrice =
            num(item.average_price);

        const currentPrice =
            num(item.price);

        const invested =
            amount * averagePrice;

        const currentValue =
            num(item.value) ||
            amount * currentPrice;

        const pnl =
            currentValue -
            invested;

        const pnlPercent =
            invested > 0
                ? (pnl / invested) * 100
                : 0;

        totalInvested += invested;
        totalCurrentValue += currentValue;

        embed.addFields({
            name:
                `${assetIcon(item.symbol)} ${item.symbol} • ${item.name || item.symbol}`,
            value:
                `📦 **Amount:** ${formatAmount(amount)}\n` +
                `💵 **Invested:** ${money(invested)}\n` +
                `🏷️ **Current Sell Price:** ${money(currentPrice)}\n` +
                `💰 **Current Value:** ${money(currentValue)}\n` +
                `${profitEmoji(pnl)} **P/L:** ` +
                `${pnl >= 0 ? "+" : ""}${money(pnl)} ` +
                `(${pnl >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
            inline: false
        });
    }

    const totalPnl =
        totalCurrentValue -
        totalInvested;

    const totalPnlPercent =
        totalInvested > 0
            ? (totalPnl / totalInvested) * 100
            : 0;

    embed.addFields(
        {
            name: "📦 TOTAL INVESTED",
            value:
                `${CURRENCY} **${money(totalInvested)}**`,
            inline: true
        },
        {
            name: "💰 CURRENT VALUE",
            value:
                `${CURRENCY} **${money(totalCurrentValue)}**`,
            inline: true
        },
        {
            name:
                `${profitEmoji(totalPnl)} TOTAL P/L`,
            value:
                `${totalPnl >= 0 ? "+" : ""}` +
                `${money(totalPnl)} ` +
                `(${totalPnl >= 0 ? "+" : ""}` +
                `${totalPnlPercent.toFixed(2)}%)`,
            inline: true
        }
    );

    embed.setFooter({
        text:
            "MarketBot • Current sell price uses the live market"
    });

    return embed;
}

/* =========================================================
   HELP
========================================================= */

function createHelpEmbed() {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(
            "📚 MARKETBOT COMMANDS"
        )
        .setDescription(
            "Everything you need to use MarketBot.\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        .addFields(
            {
                name: "💳 FINANCES",
                value:
                    "`!balance` — View your balance\n" +
                    "`!deposit <amount>` — Deposit money\n" +
                    "`!withdraw <amount>` — Withdraw money\n" +
                    "`!portfolio` — View your investments",
                inline: false
            },
            {
                name: "📈 MARKET",
                value:
                    "`!market` — View all assets\n" +
                    "`!info <asset>` — Detailed asset information\n" +
                    "`!history <asset>` — View price history",
                inline: false
            },
            {
                name: "💱 TRADING",
                value:
                    "`!buy <asset> <amount>` — Buy an asset\n" +
                    "`!sell <asset> <amount>` — Sell an asset",
                inline: false
            },
            {
                name: "🎁 REWARDS",
                value:
                    "`!daily` — Daily reward\n" +
                    "`!weekly` — Weekly reward\n" +
                    "`!luck` — Try your luck",
                inline: false
            },
            {
                name: "🛒 SHOP",
                value:
                    "`!shop` — View shop\n" +
                    "`!shop buy <item>` — Purchase an item\n" +
                    "`!inventory` — View inventory",
                inline: false
            },
            {
                name: "🏆 OTHER",
                value:
                    "`!leaderboard` — View richest users\n" +
                    "`!transactions` — View your trades\n" +
                    "`!owner` — View bot owner information\n" +
                    "`!ping` — Check bot latency",
                inline: false
            }
        )
        .setFooter({
            text:
                "MarketBot • Virtual economy"
        });
}

/* =========================================================
   MARKET ENGINE
========================================================= */

function updateMarket() {
    const assets =
        db.getAllAssets() || [];

    for (const asset of assets) {
        const movement =
            (Math.random() * 3.5 + 0.5) *
            (
                Math.random() < 0.5
                    ? -1
                    : 1
            );

        const result =
            db.setAssetChange(
                asset.symbol,
                movement
            );

        if (result?.success) {
            console.log(
                `[MARKET] ${asset.symbol}: ` +
                `${percent(result.oldChange)} -> ` +
                `${percent(result.newChange)}`
            );
        }
    }
}

/* =========================================================
   COMMAND HANDLER
========================================================= */

client.on(
    "messageCreate",
    async message => {
        try {
            if (message.author.bot) {
                return;
            }

            if (
                !message.content.startsWith(
                    PREFIX
                )
            ) {
                return;
            }

            const args =
                message.content
                    .slice(PREFIX.length)
                    .trim()
                    .split(/\s+/);

            const command =
                String(
                    args.shift() || ""
                ).toLowerCase();

            if (!command) {
                return;
            }

            const userId =
                message.author.id;

            /* MARKET */

            if (command === "market") {
                return message.reply({
                    embeds: [
                        createMarketEmbed()
                    ]
                });
            }

            if (command === "info") {
                const symbol =
                    cleanSymbol(args[0]);

                if (!symbol) {
                    return message.reply(
                        "❌ Usage: `!info BTC`"
                    );
                }

                return message.reply({
                    embeds: [
                        createInfoEmbed(symbol)
                    ]
                });
            }

            if (command === "history") {
                const symbol =
                    cleanSymbol(args[0]);

                if (!symbol) {
                    return message.reply(
                        "❌ Usage: `!history BTC`"
                    );
                }

                return message.reply({
                    embeds: [
                        createHistoryEmbed(symbol)
                    ]
                });
            }

            /* BALANCE */

            if (
                command === "balance" ||
                command === "bal"
            ) {
                const user =
                    db.getOrCreateUser(
                        userId
                    );

                return message.reply({
                    embeds: [
                        createBalanceEmbed(
                            userId,
                            user
                        )
                    ]
                });
            }

            /* PORTFOLIO */

            if (
                command === "portfolio" ||
                command === "pf"
            ) {
                return message.reply({
                    embeds: [
                        createPortfolioEmbed(
                            userId
                        )
                    ]
                });
            }

            /* BUY */

            if (command === "buy") {
                const symbol =
                    cleanSymbol(args[0]);

                const amountArg =
                    String(
                        args[1] || ""
                    );

                if (
                    !symbol ||
                    !amountArg
                ) {
                    return message.reply(
                        "❌ Usage: `!buy BTC 1`"
                    );
                }

                const asset =
                    findAsset(symbol);

                if (!asset) {
                    return message.reply(
                        `❌ **${symbol}** is not a valid asset.`
                    );
                }

                const user =
                    db.getOrCreateUser(
                        userId
                    );

                let amount;

                /* Hidden but working: !buy BTC all */

                if (
                    amountArg.toLowerCase() ===
                    "all"
                ) {
                    amount =
                        Math.floor(
                            num(user.wallet) /
                            num(asset.price)
                        );

                    if (amount <= 0) {
                        return message.reply(
                            `❌ You don't have enough ${CURRENCY} to buy **${symbol}**.`
                        );
                    }
                } else {
                    amount =
                        Number(amountArg);

                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {
                        return message.reply(
                            "❌ Enter a valid amount."
                        );
                    }

                    amount =
                        Math.round(
                            amount * 100
                        ) / 100;
                }

                const result =
                    db.buyAsset(
                        userId,
                        symbol,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Purchase failed."}`
                    );
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0x57F287
                            )
                            .setTitle(
                                "✅ PURCHASE COMPLETE"
                            )
                            .setDescription(
                                `${assetIcon(symbol)} **${symbol}** was added to your portfolio.`
                            )
                            .addFields(
                                {
                                    name: "📦 Amount",
                                    value:
                                        formatAmount(
                                            result.amount
                                        ),
                                    inline: true
                                },
                                {
                                    name: "🏷️ Price",
                                    value:
                                        money(
                                            result.price
                                        ),
                                    inline: true
                                },
                                {
                                    name: "💸 Total",
                                    value:
                                        money(
                                            result.total
                                        ),
                                    inline: true
                                },
                                {
                                    name: "👛 Remaining",
                                    value:
                                        `${CURRENCY} ${money(result.balance)}`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text:
                                    "MarketBot • Virtual economy"
                            })
                            .setTimestamp()
                    ]
                });
            }

            /* SELL */

            if (command === "sell") {
                const symbol =
                    cleanSymbol(args[0]);

                const amountArg =
                    String(
                        args[1] || ""
                    );

                if (
                    !symbol ||
                    !amountArg
                ) {
                    return message.reply(
                        "❌ Usage: `!sell BTC 1`"
                    );
                }

                const asset =
                    findAsset(symbol);

                if (!asset) {
                    return message.reply(
                        `❌ **${symbol}** is not a valid asset.`
                    );
                }

                let amount;

                /* Hidden but working: !sell BTC all */

                if (
                    amountArg.toLowerCase() ===
                    "all"
                ) {
                    const portfolio =
                        db.getPortfolio(
                            userId
                        ) || [];

                    const holding =
                        portfolio.find(
                            x =>
                                cleanSymbol(
                                    x.symbol
                                ) === symbol &&
                                num(x.amount) > 0
                        );

                    if (!holding) {
                        return message.reply(
                            `❌ You don't own any **${symbol}**.`
                        );
                    }

                    amount =
                        num(
                            holding.amount
                        );
                } else {
                    amount =
                        Number(amountArg);

                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {
                        return message.reply(
                            "❌ Enter a valid amount."
                        );
                    }

                    amount =
                        Math.round(
                            amount * 100
                        ) / 100;
                }

                const result =
                    db.sellAsset(
                        userId,
                        symbol,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason || "Sale failed."}`
                    );
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0x57F287
                            )
                            .setTitle(
                                "✅ SALE COMPLETE"
                            )
                            .setDescription(
                                `${assetIcon(symbol)} **${symbol}** was sold.`
                            )
                            .addFields(
                                {
                                    name: "📦 Amount",
                                    value:
                                        formatAmount(
                                            result.amount
                                        ),
                                    inline: true
                                },
                                {
                                    name: "🏷️ Sell Price",
                                    value:
                                        money(
                                            result.price
                                        ),
                                    inline: true
                                },
                                {
                                    name: "💰 Received",
                                    value:
                                        `${CURRENCY} ${money(result.total)}`,
                                    inline: true
                                },
                                {
                                    name: "👛 New Balance",
                                    value:
                                        `${CURRENCY} ${money(result.balance)}`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text:
                                    "MarketBot • Virtual economy"
                            })
                            .setTimestamp()
                    ]
                });
            }

            /* DEPOSIT
               !dep ALSO WORKS BUT IS HIDDEN FROM HELP */

            if (
                command === "deposit" ||
                command === "dep"
            ) {
                const amount =
                    Number(args[0]);

                if (
                    !Number.isFinite(
                        amount
                    ) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Usage: `!deposit <amount>`"
                    );
                }

                const result =
                    db.deposit(
                        userId,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason}`
                    );
                }

                return message.reply(
                    `🏦 Deposited ${CURRENCY} **${money(amount)}** into your bank.`
                );
            }

            /* WITHDRAW
               !with ALSO WORKS BUT IS HIDDEN FROM HELP */

            if (
                command === "withdraw" ||
                command === "with"
            ) {
                const amount =
                    Number(args[0]);

                if (
                    !Number.isFinite(
                        amount
                    ) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Usage: `!withdraw <amount>`"
                    );
                }

                const result =
                    db.withdraw(
                        userId,
                        amount
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason}`
                    );
                }

                return message.reply(
                    `👛 Withdrew ${CURRENCY} **${money(amount)}** from your bank.`
                );
            }

            /* GIVE */

            if (command === "give") {
                const target =
                    message.mentions.users.first();

                const amount =
                    Number(args[1]);

                if (!target) {
                    return message.reply(
                        "❌ Mention a user."
                    );
                }

                if (
                    !Number.isFinite(
                        amount
                    ) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Enter a valid amount."
                    );
                }

                const sender =
                    db.getOrCreateUser(
                        userId
                    );

                if (
                    num(sender.wallet) <
                    amount
                ) {
                    return message.reply(
                        `❌ You don't have enough ${CURRENCY}.`
                    );
                }

                const removed =
                    db.removeWallet(
                        userId,
                        amount
                    );

                if (!removed) {
                    return message.reply(
                        "❌ Transfer failed."
                    );
                }

                db.addWallet(
                    target.id,
                    amount
                );

                return message.reply(
                    `💸 Sent ${CURRENCY} **${money(amount)}** to <@${target.id}>.`
                );
            }

            /* SHOP */

            if (command === "shop") {
                const sub =
                    String(
                        args[0] || ""
                    ).toLowerCase();

                if (
                    sub === "buy" ||
                    sub === "purchase"
                ) {
                    const item =
                        String(
                            args[1] || ""
                        ).toLowerCase();

                    if (!item) {
                        return message.reply(
                            "❌ Usage: `!shop buy <item>`"
                        );
                    }

                    const result =
                        db.buyShopItem(
                            userId,
                            item
                        );

                    if (!result.success) {
                        return message.reply(
                            `❌ ${result.reason}`
                        );
                    }

                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(
                                    0x57F287
                                )
                                .setTitle(
                                    "🛒 PURCHASED"
                                )
                                .setDescription(
                                    `You purchased **${item}**.`
                                )
                                .addFields({
                                    name:
                                        "💸 Price",
                                    value:
                                        `${CURRENCY} ${money(result.price)}`,
                                    inline: true
                                })
                                .setTimestamp()
                        ]
                    });
                }

                const items =
                    db.getShopItems();

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0xFEE75C
                        )
                        .setTitle(
                            "🛒 MARKETBOT SHOP"
                        )
                        .setDescription(
                            "Buy virtual items using your wallet.\n" +
                            "Use `!shop buy <item>` to purchase."
                        );

                for (const item of items) {
                    embed.addFields({
                        name:
                            `🏷️ ${item.item}`,
                        value:
                            `${CURRENCY} **${money(item.price)}**\n` +
                            `\`!shop buy ${item.item}\``,
                        inline: true
                    });
                }

                return message.reply({
                    embeds: [embed]
                });
            }

            /* INVENTORY */

            if (
                command === "inventory" ||
                command === "inv"
            ) {
                const inventory =
                    db.getInventory(
                        userId
                    );

                if (
                    !inventory ||
                    inventory.length === 0
                ) {
                    return message.reply(
                        "🎒 Your inventory is empty."
                    );
                }

                const text =
                    inventory
                        .map(
                            item =>
                                `**${item.item}** × ${formatAmount(item.amount)}`
                        )
                        .join("\n");

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0x5865F2
                            )
                            .setTitle(
                                "🎒 YOUR INVENTORY"
                            )
                            .setDescription(
                                text
                            )
                    ]
                });
            }

            /* TRANSACTIONS */

            if (
                command === "transactions" ||
                command === "tx"
            ) {
                const transactions =
                    db.getTransactions(
                        userId,
                        10
                    );

                if (
                    !transactions ||
                    transactions.length === 0
                ) {
                    return message.reply(
                        "📜 You have no transactions yet."
                    );
                }

                const text =
                    transactions
                        .map(tx => {
                            const type =
                                String(
                                    tx.type || ""
                                ).toUpperCase();

                            const emoji =
                                type === "BUY"
                                    ? "🟢"
                                    : "🔴";

                            return (
                                `${emoji} **${type}** ${cleanSymbol(tx.symbol)} × ${formatAmount(tx.amount)}\n` +
                                `　${money(tx.total)}`
                            );
                        })
                        .join("\n\n");

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0x5865F2
                            )
                            .setTitle(
                                "📜 TRANSACTION HISTORY"
                            )
                            .setDescription(
                                text.slice(
                                    0,
                                    4000
                                )
                            )
                    ]
                });
            }

            /* LEADERBOARD */

            if (
                command === "leaderboard" ||
                command === "lb"
            ) {
                const users =
                    db.getLeaderboard(
                        10
                    );

                if (
                    !users ||
                    users.length === 0
                ) {
                    return message.reply(
                        "🏆 No leaderboard data yet."
                    );
                }

                const text =
                    users
                        .map(
                            (
                                user,
                                index
                            ) => {
                                const rank =
                                    index === 0
                                        ? "🥇"
                                        : index === 1
                                            ? "🥈"
                                            : index === 2
                                                ? "🥉"
                                                : `**${index + 1}.**`;

                                const worth =
                                    num(
                                        user.netWorth ??
                                        user.net_worth
                                    );

                                return (
                                    `${rank} <@${user.user_id}> — ` +
                                    `${CURRENCY} **${money(worth)}**`
                                );
                            }
                        )
                        .join("\n");

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0xFEE75C
                            )
                            .setTitle(
                                "🏆 MARKETBOT LEADERBOARD"
                            )
                            .setDescription(
                                text
                            )
                            .setFooter({
                                text:
                                    "Ranked by net worth"
                            })
                    ]
                });
            }

            /* DAILY */

            if (command === "daily") {
                const result =
                    db.setDailyClaim(
                        userId
                    );

                if (!result.success) {
                    return message.reply(
                        "⏳ You already claimed your daily reward."
                    );
                }

                return message.reply(
                    `🎁 Daily reward: ${CURRENCY} **${money(result.amount)}**`
                );
            }

            /* WEEKLY */

            if (command === "weekly") {
                const result =
                    db.setWeeklyClaim(
                        userId
                    );

                if (!result.success) {
                    return message.reply(
                        "⏳ You already claimed your weekly reward."
                    );
                }

                return message.reply(
                    `🎁 Weekly reward: ${CURRENCY} **${money(result.amount)}**`
                );
            }

            /* LUCK */

            if (command === "luck") {
                const result =
                    db.claimLuck(
                        userId
                    );

                if (!result.success) {
                    return message.reply(
                        "⏳ You already used luck today."
                    );
                }

                if (result.won) {
                    return message.reply(
                        `🍀 You won ${CURRENCY} **${money(result.amount)}**!`
                    );
                }

                return message.reply(
                    "🍀 You didn't win this time. Try again tomorrow."
                );
            }

            /* PING */

            if (command === "ping") {
                return message.reply(
                    `🏓 Pong! **${client.ws.ping}ms**`
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
                            .setColor(
                                0xED4245
                            )
                            .setTitle(
                                "👑 MARKETBOT OWNER"
                            )
                            .setDescription(
                                "MarketBot management."
                            )
                            .addFields(
                                {
                                    name:
                                        "👑 Owners",
                                    value:
                                        "MarketBot Owners",
                                    inline: true
                                },
                                {
                                    name:
                                        "⚙️ Management",
                                    value:
                                        "Use `!ownercmds` if you have permission.",
                                    inline: true
                                }
                            )
                            .setFooter({
                                text:
                                    "MarketBot"
                            })
                    ]
                });
            }

            /* OWNER COMMANDS */

            if (
                command ===
                "ownercmds"
            ) {
                if (
                    !isStaff(userId)
                ) {
                    return message.reply(
                        "❌ You don't have permission to use this command."
                    );
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0xED4245
                            )
                            .setTitle(
                                "🔐 OWNER COMMANDS"
                            )
                            .setDescription(
                                "`!set <asset> <amount>+`\n" +
                                "`!set <asset> <amount>-`\n" +
                                "`!resetmarket`\n" +
                                "`!resetbalance @user`\n" +
                                "`!resetall`"
                            )
                    ]
                });
            }

            /* SET */

            if (command === "set") {
                if (
                    !isStaff(userId)
                ) {
                    return message.reply(
                        "❌ You don't have permission to use this command."
                    );
                }

                const symbol =
                    cleanSymbol(args[0]);

                const value =
                    String(
                        args[1] || ""
                    );

                if (
                    !symbol ||
                    !value
                ) {
                    return message.reply(
                        "❌ Usage: `!set BTC 60+`"
                    );
                }

                const last =
                    value[
                        value.length - 1
                    ];

                if (
                    last !== "+" &&
                    last !== "-"
                ) {
                    return message.reply(
                        "❌ End the amount with `+` or `-`."
                    );
                }

                const amount =
                    Number(
                        value.slice(
                            0,
                            -1
                        )
                    );

                if (
                    !Number.isFinite(
                        amount
                    ) ||
                    amount <= 0
                ) {
                    return message.reply(
                        "❌ Enter a valid amount."
                    );
                }

                const movement =
                    last === "+"
                        ? amount
                        : -amount;

                const result =
                    db.setAssetChange(
                        symbol,
                        movement
                    );

                if (!result.success) {
                    return message.reply(
                        `❌ ${result.reason}`
                    );
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                result.newChange >= 0
                                    ? 0x57F287
                                    : 0xED4245
                            )
                            .setTitle(
                                "⚙️ MARKET UPDATED"
                            )
                            .setDescription(
                                `${assetIcon(symbol)} **${symbol}** was manually adjusted.`
                            )
                            .addFields(
                                {
                                    name:
                                        "BEFORE",
                                    value:
                                        percent(
                                            result.oldChange
                                        ),
                                    inline: true
                                },
                                {
                                    name:
                                        "AFTER",
                                    value:
                                        percent(
                                            result.newChange
                                        ),
                                    inline: true
                                },
                                {
                                    name:
                                        "PRICE",
                                    value:
                                        money(
                                            result.newPrice
                                        ),
                                    inline: true
                                }
                            )
                            .setTimestamp()
                    ]
                });
            }

            /* RESET MARKET */

            if (
                command ===
                "resetmarket"
            ) {
                if (
                    !isOwner(userId)
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                db.resetMarket();

                return message.reply(
                    "🔄 Market history and market changes have been reset."
                );
            }

            /* RESET BALANCE */

            if (
                command ===
                "resetbalance"
            ) {
                if (
                    !isOwner(userId)
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                const target =
                    message.mentions.users.first();

                if (!target) {
                    return message.reply(
                        "❌ Mention a user."
                    );
                }

                db.resetBalance(
                    target.id
                );

                return message.reply(
                    `🔄 Reset the balance of <@${target.id}>.`
                );
            }

            /* RESET ALL */

            if (
                command ===
                "resetall"
            ) {
                if (
                    !isOwner(userId)
                ) {
                    return message.reply(
                        "❌ Owner only."
                    );
                }

                db.resetAll();

                return message.reply(
                    "🔄 All economy data has been reset."
                );
            }

        } catch (error) {
            console.error(
                "[COMMAND ERROR]",
                error
            );

            return message.reply(
                "❌ An error occurred while executing that command."
            ).catch(() => {});
        }
    }
);

/* =========================================================
   STARTUP
========================================================= */

client.once(
    "clientReady",
    () => {
        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            "📊 Market engine started"
        );

        updateMarket();

        setInterval(
            updateMarket,
            30 * 1000
        );
    }
);

client.on(
    "error",
    error => {
        console.error(
            "[DISCORD ERROR]",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "[UNHANDLED REJECTION]",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "[UNCAUGHT EXCEPTION]",
            error
        );
    }
);

client.login(
    process.env.TOKEN
);