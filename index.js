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
const GUILD_ID = process.env.GUILD_ID; // Remove if using global

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
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command registered.');
  } catch (error) {
    console.error('❌ Slash command error:', error);
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

// ===== CREATE EMBED =====
function createStatsEmbed(data, discordUser) {
  return new EmbedBuilder()
    .setTitle(`STATS FOR @${data.discordUsername}`)
    .setColor(0x2b2d31)
    .setThumbnail(discordUser.displayAvatarURL({ dynamic: true }))
    .setDescription(`**AUTOHAR STATS**`)
    .addFields(
      {
        name: '**TODAY STATS**',
        value: `Hit: ${data.stats?.todayAccounts ?? 0}\nSummary: ${data.stats?.todaySummary ?? 0}\nRobux: ${data.stats?.todayRobux ?? 0}\nRAP: ${data.stats?.todayRAP ?? 0}`,
        inline: false
      },
      {
        name: '**TOTAL STATS**',
        value: `Hit: ${data.stats?.totalAccounts ?? 0}\nSummary: ${data.stats?.totalSummary ?? 0}\nRobux: ${data.stats?.totalRobux ?? 0}\nRAP: ${data.stats?.totalRAP ?? 0}`,
        inline: false
      },
      {
        name: '**NETWORK STATS**',
        value: `Direct Referrals: ${data.networkStats?.directReferrals ?? 0}\nTotal Network: ${data.networkStats?.totalNetwork ?? 0}\nReferral Code: ${data.networkStats?.referralCode ?? "N/A"}`,
        inline: false
      },
      {
        name: '**LAST HIT**',
        value: `User: ${data.lastHit?.username ?? "N/A"}\nRobux: ${data.lastHit?.robux ?? 0}\nTimestamp: ${data.lastHit?.timestamp ? new Date(data.lastHit.timestamp).toLocaleString() : "N/A"}`,
        inline: false
      }
    )
    .setFooter({ text: `Requested by ${discordUser.tag}` })
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
    interaction.editReply({ embeds: [embed] });
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
  message.reply({ embeds: [embed] });
});

// ===== START =====
registerCommands();
client.login(TOKEN);
