require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder
} = require('discord.js');

const axios = require('axios');

// ===== ENV =====
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // remove if global

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== REGISTER SLASH COMMAND =====
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('Check your stats or someone else stats')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to check stats for')
          .setRequired(false)
      )
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command registered.');
  } catch (err) {
    console.error(err);
  }
}

// ===== FETCH API =====
async function fetchStats(discordId) {
  try {
    const response = await axios.get(
      `https://www.incbot.site/api/bot/stats/discord/${discordId}`,
      {
        headers: {
          "User-Agent": "Incbot-Discord-Bot",
          "Accept": "application/json"
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("API Error:", error.response?.status, error.message);
    return null;
  }
}

// ===== EMBED BUILDER =====
function createStatsEmbed(data, user) {

  const lastHitTime = data.lastHit?.timestamp
    ? `<t:${Math.floor(new Date(data.lastHit.timestamp).getTime() / 1000)}:R>`
    : "N/A";

  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`Stats for @${data.discordUsername}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name: '📊 TODAY STATS',
        value:
`Hits: ${data.todayStats?.hits ?? 0}
Summary: ${(data.todayStats?.summary ?? 0).toLocaleString()}
RAP: ${(data.todayStats?.rap ?? 0).toLocaleString()}
Robux: ${(data.todayStats?.robux ?? 0).toLocaleString()}`,
        inline: false
      },
      {
        name: '🏆 TOTAL STATS',
        value:
`Total Hits: ${data.totalStats?.hits ?? 0}
Summary: ${(data.totalStats?.summary ?? 0).toLocaleString()}
RAP: ${(data.totalStats?.rap ?? 0).toLocaleString()}
Robux: ${(data.totalStats?.robux ?? 0).toLocaleString()}`,
        inline: false
      },
      {
        name: '🔥 BIGGEST HIT',
        value:
`Summary: ${(data.biggestHits?.summary ?? 0).toLocaleString()}
RAP: ${(data.biggestHits?.rap ?? 0).toLocaleString()}
Robux: ${(data.biggestHits?.robux ?? 0).toLocaleString()}`,
        inline: false
      },
      {
        name: '🕒 LAST HIT',
        value:
`User: ${data.lastHit?.user ?? "N/A"}
Time: ${lastHitTime}`,
        inline: false
      },
      {
        name: '🌐 NETWORK',
        value:
`Direct Referrals: ${data.networkStats?.directReferrals ?? 0}
Total Network: ${data.networkStats?.totalNetwork ?? 0}
Referral Code: ${data.networkStats?.referralCode ?? "N/A"}`,
        inline: false
      }
    )
    .setFooter({ text: `Requested by ${user.tag}` })
    .setTimestamp();
}

// ===== READY =====
client.once('clientReady', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ===== SLASH COMMAND =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stats') {

    const target = interaction.options.getUser('user') || interaction.user;

    await interaction.deferReply();

    const data = await fetchStats(target.id);

    if (!data) {
      return interaction.editReply('❌ Failed to fetch stats.');
    }

    const embed = createStatsEmbed(data, target);

    interaction.editReply({
      content: `<@${target.id}>`,
      embeds: [embed]
    });
  }
});

// ===== PREFIX COMMAND =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!stats')) return;

  const target = message.mentions.users.first() || message.author;

  const data = await fetchStats(target.id);

  if (!data) {
    return message.reply('❌ Failed to fetch stats.');
  }

  const embed = createStatsEmbed(data, target);

  message.reply({
    content: `<@${target.id}>`,
    embeds: [embed]
  });
});

// ===== START =====
registerCommands();
client.login(TOKEN);
