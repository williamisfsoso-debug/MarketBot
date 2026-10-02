require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const db = require("./database");

const PREFIX = "!";
const CURRENCY = "🪙";

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    throw new Error("TOKEN is missing from environment variables.");
}

/* =========================================================
   OWNERS
========================================================= */

const OWNERS = [
    "1410867769729351772",
    "1300582883873787960"
];

const CO_OWNER = "1388444379743785071";

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* =========================================================
   ASSET ICONS
========================================================= */

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
    return `${CURRENCY} ${num(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function compactMoney(value) {
    const n = num(value);

    if (n >= 1_000_000_000) {
        return `${CURRENCY} ${(n / 1_000_000_000).toFixed(2)}B`;
    }

    if (n >= 1_000_000) {
        return `${CURRENCY} ${(n / 1_000_000).toFixed(2)}M`;
    }

    if (n >= 1_000) {
        return `${CURRENCY} ${(n / 1_000).toFixed(2)}K`;
    }

    return money(n);
}

function formatAmount(value) {
    const n = num(value);

    if (Number.isInteger(n)) {
        return n.toLocaleString("en-US");
    }

    return n.toLocaleString("en-US", {
        maximumFractionDigits: 6
    });
}

function percent(value) {
    const n = num(value);

    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function cleanSymbol(symbol) {
    return String(symbol || "")
        .trim()
        .toUpperCase();
}

function assetIcon(symbol) {
    return ASSET_ICONS[cleanSymbol(symbol)] || "◆";
}

function findAsset(assets, symbol) {
    const clean = cleanSymbol(symbol);

    return assets.find(
        asset => cleanSymbol(asset.symbol) === clean
    );
}

function isOwner(userId) {
    return OWNERS.includes(userId);
}

function isCoOwner(userId) {
    return userId === CO_OWNER;
}

function isStaff(userId) {
    return isOwner(userId) || isCoOwner(userId);
}

function directionIcon(change) {
    if (num(change) > 0) return "📈";
    if (num(change) < 0) return "📉";
    return "➖";
}

function directionArrow(change) {
    if (num(change) > 0) return "▲";
    if (num(change) < 0) return "▼";
    return "•";
}

function directionWord(change) {
    if (num(change) > 0) return "UP";
    if (num(change) < 0) return "DOWN";
    return "FLAT";
}

function profitEmoji(value) {
    if (num(value) > 0) return "🟢";
    if (num(value) < 0) return "🔴";
    return "⚪";
}

function trendText(change) {
    const n = num(change);

    if (n >= 25) return "🔥 Extremely bullish";
    if (n >= 10) return "🚀 Strong bullish";
    if (n >= 3) return "📈 Bullish";
    if (n > 0) return "↗️ Slightly bullish";
    if (n <= -25) return "💥 Extremely bearish";
    if (n <= -10) return "📉 Strong bearish";
    if (n <= -3) return "📉 Bearish";
    if (n < 0) return "↘️ Slightly bearish";

    return "➖ Flat";
}

function recentMove(change) {
    const n = num(change);

    if (n > 0) return `▲ ${percent(n)}`;
    if (n < 0) return `▼ ${percent(n)}`;

    return "• 0.00%";
}

function shorten(text, max = 1024) {
    const str = String(text || "");

    if (str.length <= max) return str;

    return str.slice(0, max - 3) + "...";
}

/* =========================================================
   GRAPH
========================================================= */

function makeGraph(history) {
    if (!history || history.length === 0) {
        return "▁▁▁▁▁▁▁▁▁▁▁▁";
    }

    const bars = "▁▂▃▄▅▆▇█";

    const values = history.map(item => num(item.price));

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (max === min) {
        return "▄▄▄▄▄▄▄▄▄▄▄▄";
    }

    return values
        .slice(-24)
        .map(value => {
            const normalized =
                (value - min) / (max - min);

            const index = Math.max(
                0,
                Math.min(
                    bars.length - 1,
                    Math.round(
                        normalized * (bars.length - 1)
                    )
                )
            );

            return bars[index];
        })
        .join("");
}

/* =========================================================
   ERROR EMBED
========================================================= */

function errorEmbed(message) {
    return new EmbedBuilder()
        .setColor(0xff3b3b)
        .setTitle("❌ Something went wrong")
        .setDescription(message)
        .setTimestamp();
}

/* =========================================================
   MARKET EMBED
========================================================= */

function createMarketEmbed(assets) {
    const crypto = assets.filter(
        asset => String(asset.type).toLowerCase() === "crypto"
    );

    const stocks = assets.filter(
        asset => String(asset.type).toLowerCase() === "stock"
    );

    function formatAsset(asset) {
        const change = num(asset.change_percent);

        return [
            `${assetIcon(asset.symbol)} **${asset.symbol}**`,
            `> ${money(asset.price)}  ${directionArrow(change)} **${percent(change)}**`
        ].join("\n");
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📊 Market Overview")
        .setDescription(
            "Live virtual market prices. Prices automatically move over time."
        )
        .setTimestamp()
        .setFooter({
            text: "MarketBot • Virtual Economy"
        });

    if (crypto.length) {
        embed.addFields({
            name: "🪙 CRYPTO",
            value: crypto
                .map(formatAsset)
                .join("\n\n"),
            inline: false
        });
    }

    if (stocks.length) {
        embed.addFields({
            name: "📈 STOCKS",
            value: stocks
                .map(formatAsset)
                .join("\n\n"),
            inline: false
        });
    }

    return embed;
}

/* =========================================================
   INFO EMBED
========================================================= */

async function createInfoEmbed(asset) {
    const history = await db.getMarketHistory(
        asset.symbol,
        40
    );

    const graph = makeGraph(history);

    const values = history.length
        ? history.map(item => num(item.price))
        : [num(asset.price)];

    const high = Math.max(...values);
    const low = Math.min(...values);

    const change = num(asset.change_percent);

    return new EmbedBuilder()
        .setColor(
            change >= 0
                ? 0x57f287
                : 0xed4245
        )
        .setTitle(
            `${assetIcon(asset.symbol)} ${asset.name} (${asset.symbol})`
        )
        .setDescription(
            `### ${money(asset.price)}\n` +
            `${directionIcon(change)} **${percent(change)}** • ${directionWord(change)}`
        )
        .addFields(
            {
                name: "📊 PRICE CHART",
                value: `\`${graph}\``,
                inline: false
            },
            {
                name: "📈 Market Change",
                value: `**${percent(change)}**`,
                inline: true
            },
            {
                name: "🎯 Trend",
                value: trendText(change),
                inline: true
            },
            {
                name: "💵 Base Price",
                value: money(asset.base_price),
                inline: true
            },
            {
                name: "🔺 High",
                value: money(high),
                inline: true
            },
            {
                name: "🔻 Low",
                value: money(low),
                inline: true
            },
            {
                name: "⚡ Current Move",
                value: recentMove(change),
                inline: true
            }
        )
        .setFooter({
            text: `MarketBot • ${asset.symbol}`
        })
        .setTimestamp();
}

/* =========================================================
   HISTORY EMBED
========================================================= */

async function createHistoryEmbed(asset) {
    const history = await db.getMarketHistory(
        asset.symbol,
        40
    );

    if (!history.length) {
        return new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(
                `${assetIcon(asset.symbol)} ${asset.name} History`
            )
            .setDescription(
                "There isn't enough historical market data yet."
            )
            .addFields({
                name: "Current Price",
                value: money(asset.price),
                inline: true
            })
            .setTimestamp();
    }

    const values = history.map(
        item => num(item.price)
    );

    const start = values[0];
    const current = values[values.length - 1];
    const high = Math.max(...values);
    const low = Math.min(...values);

    const movement =
        start === 0
            ? 0
            : ((current - start) / start) * 100;

    return new EmbedBuilder()
        .setColor(
            movement >= 0
                ? 0x57f287
                : 0xed4245
        )
        .setTitle(
            `📜 ${asset.name} (${asset.symbol}) History`
        )
        .setDescription(
            `### ${directionIcon(movement)} ${percent(movement)}\n` +
            `\`${makeGraph(history)}\``
        )
        .addFields(
            {
                name: "◀ Start",
                value: money(start),
                inline: true
            },
            {
                name: "● Current",
                value: money(current),
                inline: true
            },
            {
                name: "▶ Movement",
                value: percent(movement),
                inline: true
            },
            {
                name: "🔺 High",
                value: money(high),
                inline: true
            },
            {
                name: "🔻 Low",
                value: money(low),
                inline: true
            },
            {
                name: "📊 Data Points",
                value: `${history.length}`,
                inline: true
            }
        )
        .setFooter({
            text: `MarketBot • Historical data for ${asset.symbol}`
        })
        .setTimestamp();
}

/* =========================================================
   BALANCE EMBED
========================================================= */

async function createBalanceEmbed(userId, user) {
    const portfolio = await db.getPortfolio(userId);

    const investments = portfolio.reduce(
        (sum, item) =>
            sum + num(item.value),
        0
    );

    const netWorth =
        num(user.wallet) +
        num(user.bank) +
        investments;

    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("💳 Your Balance")
        .setDescription(
            "Your complete MarketBot financial overview."
        )
        .addFields(
            {
                name: "👛 Wallet",
                value: `### ${money(user.wallet)}`,
                inline: true
            },
            {
                name: "🏦 Bank",
                value: `### ${money(user.bank)}`,
                inline: true
            },
            {
                name: "📈 Investments",
                value: `### ${money(investments)}`,
                inline: true
            },
            {
                name: "💎 Net Worth",
                value: `### ${money(netWorth)}`,
                inline: false
            }
        )
        .setFooter({
            text: "MarketBot • Virtual Economy"
        })
        .setTimestamp();
}

/* =========================================================
   PORTFOLIO EMBED
========================================================= */

async function createPortfolioEmbed(userId) {
    const portfolio = await db.getPortfolio(userId);

    if (!portfolio.length) {
        return new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📁 Your Portfolio")
            .setDescription(
                "You don't own any assets yet.\n\n" +
                "Use `!buy BTC 1` to start investing."
            )
            .setTimestamp();
    }

    let totalInvested = 0;
    let totalValue = 0;

    const lines = portfolio.map(item => {
        const amount = num(item.amount);
        const average = num(item.average_price);
        const currentPrice = num(item.price);
        const value = num(item.value);

        const invested =
            amount * average;

        const pnl =
            value - invested;

        totalInvested += invested;
        totalValue += value;

        return [
            `${assetIcon(item.symbol)} **${item.symbol}**`,
            `> Amount: **${formatAmount(amount)}**`,
            `> Current: **${money(currentPrice)}**`,
            `> Value: **${money(value)}**`,
            `> P/L: ${profitEmoji(pnl)} **${money(pnl)}**`
        ].join("\n");
    });

    const totalPnl =
        totalValue - totalInvested;

    return new EmbedBuilder()
        .setColor(
            totalPnl >= 0
                ? 0x57f287
                : 0xed4245
        )
        .setTitle("📁 Your Portfolio")
        .setDescription(
            lines.join("\n\n")
        )
        .addFields(
            {
                name: "💰 Total Invested",
                value: money(totalInvested),
                inline: true
            },
            {
                name: "📊 Current Value",
                value: money(totalValue),
                inline: true
            },
            {
                name: "📈 Total P/L",
                value:
                    `${profitEmoji(totalPnl)} ${money(totalPnl)}`,
                inline: true
            }
        )
        .setFooter({
            text: "MarketBot • Portfolio"
        })
        .setTimestamp();
}

/* =========================================================
   HELP
========================================================= */

function createHelpEmbed() {
    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📖 MarketBot Commands")
        .setDescription(
            "Everything you need to use the virtual economy."
        )
        .addFields(
            {
                name: "💳 FINANCES",
                value:
                    "`!balance` — View your balance\n" +
                    "`!deposit <amount>` — Move wallet → bank\n" +
                    "`!withdraw <amount>` — Move bank → wallet\n" +
                    "`!portfolio` — View your investments"
            },
            {
                name: "📊 MARKET",
                value:
                    "`!market` — View all assets\n" +
                    "`!info <asset>` — Detailed asset information\n" +
                    "`!history <asset>` — View price history"
            },
            {
                name: "💹 TRADING",
                value:
                    "`!buy <asset> <amount>` — Buy an asset\n" +
                    "`!sell <asset> <amount>` — Sell an asset\n" +
                    "`!buy <asset> all` — Buy with all wallet money\n" +
                    "`!sell <asset> all` — Sell all owned"
            },
            {
                name: "🎁 REWARDS",
                value:
                    "`!daily` — Claim daily reward\n" +
                    "`!weekly` — Claim weekly reward\n" +
                    "`!luck` — Try your luck"
            },
            {
                name: "🛒 SHOP",
                value:
                    "`!shop` — View shop\n" +
                    "`!shop buy <item>` — Buy a shop item\n" +
                    "`!inventory` — View your items"
            },
            {
                name: "🏆 OTHER",
                value:
                    "`!leaderboard` — Top players\n" +
                    "`!transactions` — Recent transactions\n" +
                    "`!ping` — Bot latency\n" +
                    "`!owner` — Bot ownership"
            }
        )
        .setFooter({
            text: "MarketBot • Virtual Economy"
        })
        .setTimestamp();
}

/* =========================================================
   MARKET UPDATE
========================================================= */

async function updateMarket() {
    try {
        const assets = await db.getAllAssets();

        for (const asset of assets) {
            const movement =
                (Math.random() * 3.5 + 0.5) *
                (Math.random() < 0.5 ? -1 : 1);

            await db.setAssetChange(
                asset.symbol,
                movement
            );
        }

        console.log(
            `[MARKET] Updated ${assets.length} assets.`
        );
    } catch (error) {
        console.error(
            "[MARKET UPDATE ERROR]",
            error
        );
    }
}

/* =========================================================
   MESSAGE HANDLER
========================================================= */

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    if (!message.content.startsWith(PREFIX)) {
        return;
    }

    const args = message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command =
        (args.shift() || "").toLowerCase();

    if (!command) return;

    try {
        /* =====================================================
           PING
        ===================================================== */

        if (command === "ping") {
            const sent = await message.reply("🏓 Pinging...");

            const latency =
                sent.createdTimestamp -
                message.createdTimestamp;

            await sent.edit(
                `🏓 **Pong!**\n` +
                `> Bot: **${latency}ms**\n` +
                `> API: **${Math.round(client.ws.ping)}ms**`
            );

            return;
        }

        /* =====================================================
           HELP
        ===================================================== */

        if (command === "help") {
            await message.reply({
                embeds: [
                    createHelpEmbed()
                ]
            });

            return;
        }

        /* =====================================================
           BALANCE
        ===================================================== */

        if (
            command === "balance" ||
            command === "bal"
        ) {
            const user =
                await db.getOrCreateUser(
                    message.author.id
                );

            await message.reply({
                embeds: [
                    await createBalanceEmbed(
                        message.author.id,
                        user
                    )
                ]
            });

            return;
        }

        /* =====================================================
           DEPOSIT
        ===================================================== */

        if (
            command === "deposit" ||
            command === "dep"
        ) {
            const amountArg = args[0];

            if (!amountArg) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!deposit <amount>`"
                        )
                    ]
                });

                return;
            }

            const amount =
                Number(amountArg);

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Enter a valid positive amount."
                        )
                    ]
                });

                return;
            }

            const result =
                await db.deposit(
                    message.author.id,
                    amount
                );

            if (!result.success) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            result.reason
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("🏦 Deposit Complete")
                        .setDescription(
                            `You deposited **${money(amount)}** into your bank.`
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           WITHDRAW
        ===================================================== */

        if (
            command === "withdraw" ||
            command === "with"
        ) {
            const amountArg = args[0];

            if (!amountArg) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!withdraw <amount>`"
                        )
                    ]
                });

                return;
            }

            const amount =
                Number(amountArg);

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Enter a valid positive amount."
                        )
                    ]
                });

                return;
            }

            const result =
                await db.withdraw(
                    message.author.id,
                    amount
                );

            if (!result.success) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            result.reason
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("💵 Withdrawal Complete")
                        .setDescription(
                            `You withdrew **${money(amount)}** from your bank.`
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           MARKET
        ===================================================== */

        if (command === "market") {
            const assets =
                await db.getAllAssets();

            await message.reply({
                embeds: [
                    createMarketEmbed(assets)
                ]
            });

            return;
        }

        /* =====================================================
           INFO
        ===================================================== */

        if (command === "info") {
            const symbol = args[0];

            if (!symbol) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!info <asset>`\nExample: `!info BTC`"
                        )
                    ]
                });

                return;
            }

            const asset =
                await db.getAsset(symbol);

            if (!asset) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            `I couldn't find the asset **${cleanSymbol(symbol)}**.`
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    await createInfoEmbed(asset)
                ]
            });

            return;
        }

        /* =====================================================
           HISTORY
        ===================================================== */

        if (command === "history") {
            const symbol = args[0];

            if (!symbol) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!history <asset>`"
                        )
                    ]
                });

                return;
            }

            const asset =
                await db.getAsset(symbol);

            if (!asset) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            `I couldn't find the asset **${cleanSymbol(symbol)}**.`
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    await createHistoryEmbed(asset)
                ]
            });

            return;
        }

        /* =====================================================
           BUY
        ===================================================== */

        if (command === "buy") {
            const symbol = args[0];
            const amountArg = args[1];

            if (!symbol || !amountArg) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!buy <asset> <amount>`\nExample: `!buy BTC 2`"
                        )
                    ]
                });

                return;
            }

            const asset =
                await db.getAsset(symbol);

            if (!asset) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            `Asset **${cleanSymbol(symbol)}** doesn't exist.`
                        )
                    ]
                });

                return;
            }

            const user =
                await db.getOrCreateUser(
                    message.author.id
                );

            let amount;

            if (
                amountArg.toLowerCase() === "all"
            ) {
                const price =
                    num(asset.price);

                amount =
                    Math.floor(
                        (num(user.wallet) / price) *
                        1000000
                    ) / 1000000;

                if (amount <= 0) {
                    await message.reply({
                        embeds: [
                            errorEmbed(
                                "You don't have enough wallet money to buy this asset."
                            )
                        ]
                    });

                    return;
                }
            } else {
                amount =
                    Number(amountArg);
            }

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Enter a valid positive amount."
                        )
                    ]
                });

                return;
            }

            const result =
                await db.buyAsset(
                    message.author.id,
                    asset.symbol,
                    amount
                );

            if (!result.success) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            result.reason
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle(
                            `${assetIcon(asset.symbol)} Purchase Complete`
                        )
                        .setDescription(
                            `You bought **${formatAmount(result.amount)} ${asset.symbol}**.`
                        )
                        .addFields(
                            {
                                name: "💵 Price",
                                value: money(result.price),
                                inline: true
                            },
                            {
                                name: "💰 Total",
                                value: money(result.total),
                                inline: true
                            },
                            {
                                name: "👛 Wallet",
                                value: money(result.balance),
                                inline: true
                            }
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           SELL
        ===================================================== */

        if (command === "sell") {
            const symbol = args[0];
            const amountArg = args[1];

            if (!symbol || !amountArg) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!sell <asset> <amount>`\nExample: `!sell BTC 2`"
                        )
                    ]
                });

                return;
            }

            const asset =
                await db.getAsset(symbol);

            if (!asset) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            `Asset **${cleanSymbol(symbol)}** doesn't exist.`
                        )
                    ]
                });

                return;
            }

            let amount;

            if (
                amountArg.toLowerCase() === "all"
            ) {
                const portfolio =
                    await db.getPortfolio(
                        message.author.id
                    );

                const holding =
                    portfolio.find(
                        item =>
                            cleanSymbol(item.symbol) ===
                            cleanSymbol(asset.symbol)
                    );

                if (!holding) {
                    await message.reply({
                        embeds: [
                            errorEmbed(
                                `You don't own any ${asset.symbol}.`
                            )
                        ]
                    });

                    return;
                }

                amount =
                    num(holding.amount);
            } else {
                amount =
                    Number(amountArg);
            }

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Enter a valid positive amount."
                        )
                    ]
                });

                return;
            }

            const result =
                await db.sellAsset(
                    message.author.id,
                    asset.symbol,
                    amount
                );

            if (!result.success) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            result.reason
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle(
                            `${assetIcon(asset.symbol)} Sale Complete`
                        )
                        .setDescription(
                            `You sold **${formatAmount(result.amount)} ${asset.symbol}**.`
                        )
                        .addFields(
                            {
                                name: "💵 Price",
                                value: money(result.price),
                                inline: true
                            },
                            {
                                name: "💰 Received",
                                value: money(result.total),
                                inline: true
                            },
                            {
                                name: "👛 Wallet",
                                value: money(result.balance),
                                inline: true
                            }
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           PORTFOLIO
        ===================================================== */

        if (
            command === "portfolio" ||
            command === "port"
        ) {
            await message.reply({
                embeds: [
                    await createPortfolioEmbed(
                        message.author.id
                    )
                ]
            });

            return;
        }

        /* =====================================================
           DAILY
        ===================================================== */

        if (command === "daily") {
            const result =
                await db.setDailyClaim(
                    message.author.id
                );

            if (!result.success) {
                const remaining =
                    Math.max(
                        0,
                        result.next -
                        Date.now()
                    );

                const hours =
                    Math.floor(
                        remaining /
                        (60 * 60 * 1000)
                    );

                const minutes =
                    Math.floor(
                        (remaining %
                            (60 * 60 * 1000)) /
                        (60 * 1000)
                    );

                await message.reply({
                    embeds: [
                        errorEmbed(
                            `You already claimed your daily reward.\nCome back in **${hours}h ${minutes}m**.`
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("🎁 Daily Reward")
                        .setDescription(
                            `You received **${money(result.amount)}**!`
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           WEEKLY
        ===================================================== */

        if (command === "weekly") {
            const result =
                await db.setWeeklyClaim(
                    message.author.id
                );

            if (!result.success) {
                const remaining =
                    Math.max(
                        0,
                        result.next -
                        Date.now()
                    );

                const days =
                    Math.floor(
                        remaining /
                        (24 * 60 * 60 * 1000)
                    );

                const hours =
                    Math.floor(
                        (remaining %
                            (24 * 60 * 60 * 1000)) /
                        (60 * 60 * 1000)
                    );

                await message.reply({
                    embeds: [
                        errorEmbed(
                            `You already claimed your weekly reward.\nCome back in **${days}d ${hours}h**.`
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("🎁 Weekly Reward")
                        .setDescription(
                            `You received **${money(result.amount)}**!`
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           LUCK
        ===================================================== */

        if (command === "luck") {
            const result =
                await db.claimLuck(
                    message.author.id
                );

            if (!result.success) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "🍀 You already used your luck today. Come back tomorrow."
                        )
                    ]
                });

                return;
            }

            if (result.won) {
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle("🍀 Lucky!")
                            .setDescription(
                                `You won **${money(result.amount)}**!`
                            )
                            .setTimestamp()
                    ]
                });
            } else {
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xed4245)
                            .setTitle("🍀 Unlucky...")
                            .setDescription(
                                "You didn't win anything this time."
                            )
                            .setTimestamp()
                    ]
                });
            }

            return;
        }

        /* =====================================================
           SHOP
        ===================================================== */

        if (command === "shop") {
            const subcommand =
                (args[0] || "").toLowerCase();

            if (subcommand === "buy") {
                const item = args[1];

                if (!item) {
                    await message.reply({
                        embeds: [
                            errorEmbed(
                                "Usage: `!shop buy <item>`"
                            )
                        ]
                    });

                    return;
                }

                const result =
                    await db.buyShopItem(
                        message.author.id,
                        item
                    );

                if (!result.success) {
                    await message.reply({
                        embeds: [
                            errorEmbed(
                                result.reason
                            )
                        ]
                    });

                    return;
                }

                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x57f287)
                            .setTitle("🛒 Purchase Complete")
                            .setDescription(
                                `You bought **${item.toLowerCase()}**.`
                            )
                            .addFields({
                                name: "💰 Price",
                                value: money(result.price),
                                inline: true
                            })
                            .setTimestamp()
                    ]
                });

                return;
            }

            const items =
                await db.getShopItems();

            const shopLines =
                items.map(item => {
                    return `🛍️ **${item.item}**\n> ${money(item.price)}`;
                });

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setTitle("🛒 MarketBot Shop")
                        .setDescription(
                            shopLines.join("\n\n") +
                            "\n\nUse `!shop buy <item>` to purchase."
                        )
                        .setFooter({
                            text: "Items are stored in your inventory."
                        })
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           INVENTORY
        ===================================================== */

        if (command === "inventory") {
            const inventory =
                await db.getInventory(
                    message.author.id
                );

            if (!inventory.length) {
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x5865f2)
                            .setTitle("🎒 Inventory")
                            .setDescription(
                                "Your inventory is empty."
                            )
                            .setTimestamp()
                    ]
                });

                return;
            }

            const lines =
                inventory.map(item =>
                    `🧰 **${item.item}** × **${item.amount}**`
                );

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setTitle("🎒 Your Inventory")
                        .setDescription(
                            lines.join("\n")
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           LEADERBOARD
        ===================================================== */

        if (command === "leaderboard") {
            const leaderboard =
                await db.getLeaderboard(10);

            if (!leaderboard.length) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "There aren't any players yet."
                        )
                    ]
                });

                return;
            }

            const lines = [];

            for (
                let i = 0;
                i < leaderboard.length;
                i++
            ) {
                const player =
                    leaderboard[i];

                let username;

                try {
                    const user =
                        await client.users.fetch(
                            player.user_id
                        );

                    username =
                        user.username;
                } catch {
                    username =
                        `User ${player.user_id}`;
                }

                const medals = [
                    "🥇",
                    "🥈",
                    "🥉"
                ];

                const rank =
                    medals[i] ||
                    `**#${i + 1}**`;

                lines.push(
                    `${rank} **${username}**\n` +
                    `> Net Worth: **${compactMoney(player.netWorth)}**`
                );
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf1c40f)
                        .setTitle("🏆 MarketBot Leaderboard")
                        .setDescription(
                            lines.join("\n\n")
                        )
                        .setFooter({
                            text: "Ranked by total net worth"
                        })
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           TRANSACTIONS
        ===================================================== */

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
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x5865f2)
                            .setTitle("📜 Transactions")
                            .setDescription(
                                "You don't have any transactions yet."
                            )
                            .setTimestamp()
                    ]
                });

                return;
            }

            const lines =
                transactions.map(tx => {
                    const type =
                        String(tx.type)
                            .toUpperCase();

                    const icon =
                        type === "BUY"
                            ? "🟢"
                            : "🔴";

                    const action =
                        type === "BUY"
                            ? "Bought"
                            : "Sold";

                    return (
                        `${icon} **${action} ${formatAmount(tx.amount)} ${tx.symbol}**\n` +
                        `> ${money(tx.total)} @ ${money(tx.price)}`
                    );
                });

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setTitle("📜 Recent Transactions")
                        .setDescription(
                            lines.join("\n\n")
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           OWNER
        ===================================================== */

        if (command === "owner") {
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setTitle("👑 MarketBot Ownership")
                        .setDescription(
                            "MarketBot is maintained by the bot owners."
                        )
                        .addFields(
                            {
                                name: "👑 Owner",
                                value:
                                    OWNERS
                                        .map(id => `<@${id}>`)
                                        .join("\n"),
                                inline: true
                            },
                            {
                                name: "🛡️ Co-Owner",
                                value:
                                    `<@${CO_OWNER}>`,
                                inline: true
                            }
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           OWNER COMMANDS
        ===================================================== */

        if (command === "ownercmds") {
            if (!isStaff(message.author.id)) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "You don't have permission to use owner commands."
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xedc531)
                        .setTitle("👑 Owner Commands")
                        .setDescription(
                            "`!set <asset> <amount>+` — Increase market change\n" +
                            "`!set <asset> <amount>-` — Decrease market change\n" +
                            "`!resetmarket` — Reset all market prices\n" +
                            "`!give <user> <amount>` — Give wallet money\n" +
                            "`!resetbalance <user>` — Reset a user's balance\n" +
                            "`!resetall` — Reset the entire economy"
                        )
                        .setFooter({
                            text: "Owner access only"
                        })
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           SET MARKET
        ===================================================== */

        if (command === "set") {
            if (!isStaff(message.author.id)) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "You don't have permission to use this command."
                        )
                    ]
                });

                return;
            }

            const symbol = args[0];
            const changeArg = args[1];

            if (!symbol || !changeArg) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!set <asset> <amount>+` or `!set <asset> <amount>-`\nExample: `!set BTC 60+`"
                        )
                    ]
                });

                return;
            }

            const asset =
                await db.getAsset(symbol);

            if (!asset) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            `Asset **${cleanSymbol(symbol)}** doesn't exist.`
                        )
                    ]
                });

                return;
            }

            const lastChar =
                changeArg.slice(-1);

            if (
                lastChar !== "+" &&
                lastChar !== "-"
            ) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "The amount must end with `+` or `-`."
                        )
                    ]
                });

                return;
            }

            const amount =
                Number(
                    changeArg.slice(0, -1)
                );

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Enter a valid positive amount."
                        )
                    ]
                });

                return;
            }

            const movement =
                lastChar === "+"
                    ? amount
                    : -amount;

            const result =
                await db.setAssetChange(
                    asset.symbol,
                    movement
                );

            if (!result.success) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            result.reason
                        )
                    ]
                });

                return;
            }

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(
                            movement >= 0
                                ? 0x57f287
                                : 0xed4245
                        )
                        .setTitle("🛠️ Market Modified")
                        .setDescription(
                            `${assetIcon(asset.symbol)} **${asset.symbol}** has been manually adjusted.`
                        )
                        .addFields(
                            {
                                name: "Before",
                                value:
                                    `${money(result.oldPrice)}\n${percent(result.oldChange)}`,
                                inline: true
                            },
                            {
                                name: "After",
                                value:
                                    `${money(result.newPrice)}\n${percent(result.newChange)}`,
                                inline: true
                            },
                            {
                                name: "Adjustment",
                                value:
                                    `${movement >= 0 ? "+" : ""}${movement.toFixed(2)}%`,
                                inline: true
                            }
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           RESET MARKET
        ===================================================== */

        if (command === "resetmarket") {
            if (!isStaff(message.author.id)) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "You don't have permission to use this command."
                        )
                    ]
                });

                return;
            }

            await db.resetMarket();

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("🔄 Market Reset")
                        .setDescription(
                            "All assets have been returned to their base prices and market history has been cleared."
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           GIVE
        ===================================================== */

        if (command === "give") {
            if (!isStaff(message.author.id)) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "You don't have permission to use this command."
                        )
                    ]
                });

                return;
            }

            const target =
                message.mentions.users.first();

            const amount =
                Number(args[target ? 1 : 0]);

            if (!target || !Number.isFinite(amount) || amount <= 0) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!give @user <amount>`"
                        )
                    ]
                });

                return;
            }

            await db.addWallet(
                target.id,
                amount
            );

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("💸 Money Given")
                        .setDescription(
                            `Gave **${money(amount)}** to ${target}.`
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           RESET BALANCE
        ===================================================== */

        if (command === "resetbalance") {
            if (!isStaff(message.author.id)) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "You don't have permission to use this command."
                        )
                    ]
                });

                return;
            }

            const target =
                message.mentions.users.first();

            if (!target) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Usage: `!resetbalance @user`"
                        )
                    ]
                });

                return;
            }

            await db.resetBalance(
                target.id
            );

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57f287)
                        .setTitle("♻️ Balance Reset")
                        .setDescription(
                            `${target}'s wallet, bank, investments and inventory have been reset.`
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

        /* =====================================================
           RESET ALL
        ===================================================== */

        if (command === "resetall") {
            if (!isOwner(message.author.id)) {
                await message.reply({
                    embeds: [
                        errorEmbed(
                            "Only the main owners can use this command."
                        )
                    ]
                });

                return;
            }

            await db.resetAll();

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xed4245)
                        .setTitle("⚠️ Economy Reset")
                        .setDescription(
                            "The entire MarketBot economy has been reset."
                        )
                        .setTimestamp()
                ]
            });

            return;
        }

    } catch (error) {
        console.error(
            `[COMMAND ERROR: ${command}]`,
            error
        );

        try {
            await message.reply({
                embeds: [
                    errorEmbed(
                        "An unexpected error occurred while executing that command."
                    )
                ]
            });
        } catch {}
    }
});

/* =========================================================
   READY
========================================================= */

client.once("clientReady", async () => {
    console.log(
        `✅ Logged in as ${client.user.tag}`
    );

    console.log(
        "🔄 Initializing Supabase database..."
    );

    try {
        await db.initDatabase();

        console.log(
            "✅ Database ready."
        );

        await updateMarket();

        setInterval(
            updateMarket,
            30 * 1000
        );

        console.log(
            "📈 Market engine started."
        );

    } catch (error) {
        console.error(
            "❌ Failed to initialize database:",
            error
        );
    }
});

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);

/* =========================================================
   PROCESS ERRORS
========================================================= */

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
