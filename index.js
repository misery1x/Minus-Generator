const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

const cooldowns = new Map();

function checkPermissions(interaction, command) {
    const userId = interaction.user.id;
    const member = interaction.member;

    if (userId === config.owner) {
        return {
            allowed: true,
            maxGenerate: Infinity,
            cooldown: 0
        };
    }

    if (member.roles.cache.has(config.roles.silver.id)) {
        return {
            allowed: true,
            maxGenerate: config.roles.silver.maxGenerate,
            cooldown: config.roles.silver.cooldown
        };
    }

    if (member.roles.cache.has(config.roles.bronze.id)) {
        return {
            allowed: true,
            maxGenerate: config.roles.bronze.maxGenerate,
            cooldown: config.roles.bronze.cooldown
        };
    }

    return {
        allowed: false,
        maxGenerate: 0,
        cooldown: 0
    };
}

function checkCooldown(userId, cooldownTime) {
    const now = Date.now();
    const userCooldowns = cooldowns.get(userId);

    if (userCooldowns) {
        const timePassed = now - userCooldowns.timestamp;
        if (timePassed < cooldownTime) {
            const timeLeft = (cooldownTime - timePassed) / 1000;
            return Math.ceil(timeLeft);
        }
    }

    cooldowns.set(userId, {
        timestamp: now
    });

    return 0;
}

function countLines(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').filter(line => line.trim() !== '').length;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return 0;
    }
}

function addContentToFile(filePath, newContent) {
    try {
        let existingContent = '';
        if (fs.existsSync(filePath)) {
            existingContent = fs.readFileSync(filePath, 'utf8');
        }

        const contentToAdd = newContent.split('\n').filter(line => line.trim() !== '');
        const updatedContent = existingContent.trim() + '\n' + contentToAdd.join('\n');
        
        fs.writeFileSync(filePath, updatedContent.trim() + '\n');
        
        return contentToAdd.length;
    } catch (error) {
        console.error(`Error adding content to file ${filePath}:`, error);
        throw error;
    }
}

function getRandomLines(filePath, count) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const selected = [];

        if (count > lines.length) {
            throw new Error('Not enough lines in the file');
        }

        const availableLines = [...lines];

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * availableLines.length);
            selected.push(availableLines[randomIndex]);
            availableLines.splice(randomIndex, 1);
        }

        fs.writeFileSync(filePath, availableLines.join('\n') + '\n');

        return selected;
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        throw error;
    }
}

function getAvailableServices() {
    try {
        if (!fs.existsSync('./stock')) {
            fs.mkdirSync('./stock');
            return [];
        }
        return fs.readdirSync('./stock')
            .filter(file => file.endsWith('.txt'))
            .map(file => path.basename(file, '.txt'));
    } catch (error) {
        console.error('Error reading stock directory:', error);
        return [];
    }
}

const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands'),
    
    new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Show all available stocks and their amounts'),
    
    new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generate stock from a specific service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to generate stock from')
                .setRequired(true)
                .addChoices(
                    ...getAvailableServices().map(service => ({
                        name: service.toUpperCase(),
                        value: service.toLowerCase()
                    }))
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of stock to generate')
                .setRequired(true)
                .setMinValue(1)),

    new SlashCommandBuilder()
        .setName('addstock')
        .setDescription('Add stock to an existing service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to add stock to')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('Upload a .txt file with accounts')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('content')
                .setDescription('Or paste your accounts here (one per line)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('createservice')
        .setDescription('Create a new service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The name of the service to create')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('deleteservice')
        .setDescription('Delete a service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to delete')
                .setRequired(true)
                .addChoices(
                    ...getAvailableServices().map(service => ({
                        name: service.toUpperCase(),
                        value: service.toLowerCase()
                    }))
                ))
];

const rest = new REST({ version: '10' }).setToken(config.token);

async function registerCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    commands[2] = new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generate stock from a specific service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to generate stock from')
                .setRequired(true)
                .addChoices(
                    ...getAvailableServices().map(service => ({
                        name: service.toUpperCase(),
                        value: service.toLowerCase()
                    }))
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of stock to generate')
                .setRequired(true)
                .setMinValue(1));

    commands[3] = new SlashCommandBuilder()
        .setName('addstock')
        .setDescription('Add stock to an existing service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to add stock to')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('Upload a .txt file with accounts')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('content')
                .setDescription('Or paste your accounts here (one per line)')
                .setRequired(false));

    commands[4] = new SlashCommandBuilder()
        .setName('createservice')
        .setDescription('Create a new service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The name of the service to create')
                .setRequired(true));

    commands[5] = new SlashCommandBuilder()
        .setName('deleteservice')
        .setDescription('Delete a service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to delete')
                .setRequired(true)
                .addChoices(
                    ...getAvailableServices().map(service => ({
                        name: service.toUpperCase(),
                        value: service.toLowerCase()
                    }))
                ));
    
    await registerCommands();
});

async function updateCommandChoices() {
    const services = getAvailableServices();
    const serviceChoices = services.map(service => ({
        name: service.toUpperCase(),
        value: service.toLowerCase()
    }));

    const generateCommand = new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generate stock from a specific service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to generate stock from')
                .setRequired(true)
                .addChoices(...serviceChoices))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of stock to generate')
                .setRequired(true)
                .setMinValue(1));

    const deleteServiceCommand = new SlashCommandBuilder()
        .setName('deleteservice')
        .setDescription('Delete a service')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to delete')
                .setRequired(true)
                .addChoices(...serviceChoices));

    commands[2] = generateCommand;
    commands[5] = deleteServiceCommand;

    try {
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands.map(command => command.toJSON()) }
        );
        console.log('Successfully updated command choices.');
    } catch (error) {
        console.error('Error updating command choices:', error);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const perms = checkPermissions(interaction, interaction.commandName);
    
    if (['addstock', 'deleteservice', 'createservice'].includes(interaction.commandName)) {
        if (interaction.user.id !== config.owner) {
            await interaction.reply({ 
                content: '❌ Only the bot owner can use this command!',
                ephemeral: true 
            });
            return;
        }
    }

    if (!perms.allowed) {
        await interaction.reply({ 
            content: '❌ You do not have permission to use this command!',
            ephemeral: true 
        });
        return;
    }

    switch (interaction.commandName) {
        case 'help':
            const fields = [
                { name: '/help', value: 'Show this help message', inline: false },
                { name: '/stock', value: 'Show all available stocks and their amounts', inline: false },
                { name: '/generate <service> <amount>', value: `Generate stock from a specific service\n${
                    interaction.user.id === config.owner 
                        ? '**Owner**: Unlimited generation, no cooldown'
                        : `**Bronze**: Max ${config.roles.bronze.maxGenerate}, ${config.roles.bronze.cooldown/1000}s cooldown\n**Silver**: Max ${config.roles.silver.maxGenerate}, ${config.roles.silver.cooldown/1000}s cooldown`
                }`, inline: false }
            ];

            if (interaction.user.id === config.owner) {
                fields.push(
                    { name: '/addstock <service> [file/content]', value: 'Add stock to a service (upload file or paste content)', inline: false },
                    { name: '/deleteservice <service>', value: 'Delete a service', inline: false }
                );
            }

            const helpEmbed = new EmbedBuilder()
                .setTitle('🤖 Minus Generator')
                .setColor('#000000')
                .setDescription('Here are all available commands:')
                .addFields(fields)
                .setTimestamp()
                .setFooter({ text: 'Minus Generator' });
            
            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
            break;

        case 'stock':
            try {
                const stockFiles = fs.readdirSync('./stock').filter(file => file.endsWith('.txt'));
                
                if (stockFiles.length === 0) {
                    await interaction.reply('No stock files found in the stock folder!');
                    return;
                }

                const stockEmbed = new EmbedBuilder()
                    .setTitle('📊 Minus Generator Stock')
                    .setColor('#000000')
                    .setDescription('**Current Available Services**\n─────────────────────')
                    .setTimestamp()
                    .setFooter({ text: 'Minus Generator • Page 1/1' });

                stockFiles.sort((a, b) => a.localeCompare(b));

                const stockInfo = stockFiles.map(file => {
                    const serviceName = path.basename(file, '.txt');
                    const lineCount = countLines(path.join('./stock', file));
                    const status = lineCount > 0 ? '🟢' : '🔴';
                    return `${status} **${serviceName.toUpperCase()}**\n\`\`\`Stock: ${lineCount} accounts\`\`\``;
                });

                stockEmbed.setDescription(
                    '**Current Available Services**\n─────────────────────\n\n' +
                    stockInfo.join('\n')
                );

                const totalStock = stockFiles.reduce((total, file) => {
                    return total + countLines(path.join('./stock', file));
                }, 0);

                stockEmbed.addFields({
                    name: '─────────────────────',
                    value: `**Total Services:** ${stockFiles.length}\n**Total Stock:** ${totalStock} accounts`
                });

                await interaction.reply({ embeds: [stockEmbed] });
            } catch (error) {
                console.error('Error reading stock directory:', error);
                await interaction.reply('Error reading stock files!');
            }
            break;

        case 'generate':
            const service = interaction.options.getString('service').toLowerCase();
            const amount = interaction.options.getInteger('amount');
            
            if (amount > perms.maxGenerate && interaction.user.id !== config.owner) {
                await interaction.reply({ 
                    content: `❌ You can only generate up to ${perms.maxGenerate} accounts at once!`,
                    ephemeral: true 
                });
                return;
            }

            const cooldownLeft = checkCooldown(interaction.user.id, perms.cooldown);
            if (cooldownLeft > 0) {
                await interaction.reply({ 
                    content: `⏳ Please wait ${cooldownLeft} seconds before generating again!`,
                    ephemeral: true 
                });
                return;
            }

            const filePath = path.join('./stock', `${service}.txt`);

            try {
                if (!fs.existsSync(filePath)) {
                    await interaction.reply({
                        content: `Service "${service}" not found! Use /stock to see available services.`,
                        ephemeral: true
                    });
                    return;
                }

                const generated = getRandomLines(filePath, amount);
                
                const generateEmbed = new EmbedBuilder()
                    .setTitle('🎉 Minus Generator')
                    .setColor('#000000')
                    .setDescription(`Successfully generated ${amount} accounts from ${service.toUpperCase()}:`)
                    .addFields({
                        name: 'Accounts',
                        value: '```' + generated.join('\n') + '```'
                    })
                    .setTimestamp()
                    .setFooter({ text: 'Minus Generator' });

                await interaction.reply({ embeds: [generateEmbed], ephemeral: true });
            } catch (error) {
                if (error.message === 'Not enough lines in the file') {
                    const availableCount = countLines(filePath);
                    await interaction.reply({
                        content: `Not enough stock available! Only ${availableCount} accounts remaining.`,
                        ephemeral: true
                    });
                } else {
                    console.error('Error generating stock:', error);
                    await interaction.reply({
                        content: 'Error generating stock!',
                        ephemeral: true
                    });
                }
            }
            break;

        case 'addstock':
            const targetService = interaction.options.getString('service').toLowerCase();
            const file = interaction.options.getAttachment('file');
            const content = interaction.options.getString('content');
            const targetPath = path.join('./stock', `${targetService}.txt`);

            try {
                if (!fs.existsSync('./stock')) {
                    fs.mkdirSync('./stock');
                }

                let stockContent = '';
                
                if (file) {
                    if (!file.name.endsWith('.txt')) {
                        await interaction.reply('Please upload a .txt file!');
                        return;
                    }
                    
                    const response = await fetch(file.url);
                    stockContent = await response.text();
                } else if (content) {
                    stockContent = content;
                } else {
                    await interaction.reply('Please provide either a file or paste the content!');
                    return;
                }

                const addedLines = addContentToFile(targetPath, stockContent);
                const totalLines = countLines(targetPath);

                const addStockEmbed = new EmbedBuilder()
                    .setTitle('✅ Minus Generator')
                    .setColor('#000000')
                    .setDescription(`Added stock to ${targetService.toUpperCase()}`)
                    .addFields(
                        { name: 'Lines Added', value: addedLines.toString(), inline: true },
                        { name: 'Total Stock', value: totalLines.toString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Minus Generator' });

                await interaction.reply({ embeds: [addStockEmbed] });
            } catch (error) {
                console.error('Error adding stock:', error);
                await interaction.reply('Error adding stock to file!');
            }
            break;

        case 'createservice':
            const newService = interaction.options.getString('service').toLowerCase();
            const newServicePath = path.join('./stock', `${newService}.txt`);

            try {
                if (!fs.existsSync('./stock')) {
                    fs.mkdirSync('./stock');
                }

                if (fs.existsSync(newServicePath)) {
                    await interaction.reply({
                        content: `❌ Service "${newService}" already exists!`,
                        ephemeral: true
                    });
                    return;
                }

                // Create empty file
                fs.writeFileSync(newServicePath, '');

                const createServiceEmbed = new EmbedBuilder()
                    .setTitle('✨ Minus Generator')
                    .setColor('#000000')
                    .setDescription(`Successfully created service: ${newService.toUpperCase()}`)
                    .setTimestamp()
                    .setFooter({ text: 'Minus Generator' });

                await interaction.reply({ embeds: [createServiceEmbed] });
                
                // Update command choices after creating service
                await updateCommandChoices();
            } catch (error) {
                console.error('Error creating service:', error);
                await interaction.reply({
                    content: 'Error creating service!',
                    ephemeral: true
                });
            }
            break;

        case 'deleteservice':
            const serviceToDelete = interaction.options.getString('service').toLowerCase();
            const fileToDelete = path.join('./stock', `${serviceToDelete}.txt`);

            try {
                if (!fs.existsSync(fileToDelete)) {
                    await interaction.reply({
                        content: `Service "${serviceToDelete}" not found!`,
                        ephemeral: true
                    });
                    return;
                }

                const lineCount = countLines(fileToDelete);
                fs.unlinkSync(fileToDelete);

                const deleteEmbed = new EmbedBuilder()
                    .setTitle('🗑️ Minus Generator')
                    .setColor('#000000')
                    .setDescription(`Successfully deleted ${serviceToDelete.toUpperCase()}`)
                    .addFields(
                        { name: 'Accounts Removed', value: lineCount.toString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Minus Generator' });

                await interaction.reply({ embeds: [deleteEmbed] });
                
                // Update command choices after deleting service
                await updateCommandChoices();
            } catch (error) {
                console.error('Error deleting service:', error);
                await interaction.reply({
                    content: 'Error deleting service!',
                    ephemeral: true
                });
            }
            break;
    }
});

client.login(config.token);