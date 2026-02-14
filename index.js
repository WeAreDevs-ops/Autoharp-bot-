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

// ===== ENV VARIABLES =====
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional (guild deploy)

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
    console.error('❌ Failed to register commands:', error);
  }
}

// ===== FETCH API =====
async function fetchStats(discordId) {
  try {
    const response = await axios.get(
      `https://www.incbot.site/api/bot/stats/discord/${discordId}`
    );
    return response.data;
  } catch (error) {
    console.error('API Error:', error.message);
    return null;
  }
}

// ===== CREATE EMBED =====
function createStatsEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`📊 Stats for ${data.discordUsername}`)
    .setColor(0x5865F2)
    .addFields(
      { name: '📁 Directory', value: data.directory || 'N/A', inline: true },
      { name: '💎 Service Type', value: data.serviceType || 'N/A', inline: true },
      { name: '👤 Total Accounts', value: String(data.stats.totalAccounts), inline: true },
      { name: '💰 Total Robux', value: String(data.stats.totalRobux), inline: true },
      { name: '📅 Today Accounts', value: String(data.stats.todayAccounts), inline: true },
      { name: '🤝 Direct Referrals', value: String(data.networkStats.directReferrals), inline: true },
      { name: '🌐 Total Network', value: String(data.networkStats.totalNetwork), inline: true },
      { name: '🎟 Referral Code', value: data.networkStats.referralCode, inline: true },
      {
        name: '🔥 Last Hit',
        value: data.lastHit
          ? `User: ${data.lastHit.username}\nRobux: ${data.lastHit.robux}`
          : 'No recent hit',
        inline: false
      }
    )
    .setFooter({ text: `Discord ID: ${data.discordId}` })
    .setTimestamp();
}

// ===== READY =====
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ===== SLASH COMMAND HANDLER =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stats') {
    const target = interaction.options.getUser('user') || interaction.user;

    await interaction.deferReply();

    const data = await fetchStats(target.id);

    if (!data) {
      return interaction.editReply('❌ Failed to fetch stats.');
    }

    const embed = createStatsEmbed(data);
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

  const embed = createStatsEmbed(data);
  message.reply({ embeds: [embed] });
});

// ===== START =====
registerCommands();
client.login(TOKEN);
