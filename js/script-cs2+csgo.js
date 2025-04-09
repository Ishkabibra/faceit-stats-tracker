import { FACEIT_API_KEY } from '../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const FACEIT_API_URL = 'https://open.faceit.com/data/v4';
    
    const PLAYERS = [
        { nickname: '2Papa', cardId: 'player1' },
        { nickname: 'prankeRX', cardId: 'player2' },
        { nickname: 'TiltGod_', cardId: 'player3' },
        { nickname: 'li5t_', cardId: 'player4' },
    ];

    const playersDataCache = new Map();
    
    const FACEIT_LEVELS = {
        1: { min: 0, max: 500 },
        2: { min: 501, max: 750 },
        3: { min: 751, max: 900 },
        4: { min: 901, max: 1050 },
        5: { min: 1051, max: 1200 },
        6: { min: 1201, max: 1350 },
        7: { min: 1351, max: 1530 },
        8: { min: 1531, max: 1750 },
        9: { min: 1751, max: 1999 },
        10: { min: 2000, max: Infinity }
    };

    function updateLevelImage(elo, cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        const eloNumber = parseInt(elo) || 0;
        let level = 1;
        
        for (const [lvl, range] of Object.entries(FACEIT_LEVELS)) {
            if (eloNumber >= range.min && eloNumber <= range.max) {
                level = lvl;
                break;
            }
        }
        
        const levelImg = card.querySelector('.card__lvl');
        if (levelImg) {
            levelImg.src = `./images/${level}.png`;
            levelImg.onerror = () => {
                levelImg.style.display = 'none';
            };
        }
    }



    function sanitizeNumber(value) {
        if (value === undefined || value === null) return 0;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[^0-9.]/g, '');
            return parseFloat(cleaned) || 0;
        }
        return value || 0;
    }

    async function getPlayerData(nickname, game = 'cs2') {
        const cacheKey = `${nickname}_${game}`;
        
        if (playersDataCache.has(cacheKey)) {
            return playersDataCache.get(cacheKey);
        }

        try {
            const playerResponse = await fetch(`${FACEIT_API_URL}/players?nickname=${encodeURIComponent(nickname)}`, {
                headers: {
                    'Authorization': `Bearer ${FACEIT_API_KEY}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!playerResponse.ok) throw new Error('Player data not found');
            
            const playerData = await playerResponse.json();
            
            const statsResponse = await fetch(`${FACEIT_API_URL}/players/${playerData.player_id}/stats/${game}`, {
                headers: {
                    'Authorization': `Bearer ${FACEIT_API_KEY}`
                }
            });
            
            if (!statsResponse.ok) throw new Error('Stats data not found');
            
            const statsData = await statsResponse.json();
            
            const processedStats = processStatsData(statsData, game);
            
            const result = {
                ...playerData,
                stats: processedStats,
                game: game
            };
            
            playersDataCache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error(`Error getting data for ${nickname} (${game}):`, error);
            return null;
        }
    }

    function processStatsData(statsData, game) {
        const segments = statsData.segments || [];
        const lifetime = statsData.lifetime || {};

        let totalKills = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Kills), 0);
        let totalDeaths = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Deaths), 0);
        let totalMatches = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Matches), 0);
        let totalRounds = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Rounds), 0);
        let totalWins = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Wins), 0);
        let totalHeadshots = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Headshots), 0);
        let totalDamage = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["Total Damage"]), 0);
        let totalKD = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["K/D Ratio"]), 0);
        let totalKR = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["K/R Ratio"]), 0);
        let totalRoundswithextendedstats = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["Total Rounds with extended stats"]), 0);

        return {
            lifetime: {
                matches: totalMatches,
                Kills: totalKills,
                Deaths: totalDeaths,
                AverageKills: totalMatches > 0 ? totalKills / totalMatches : 0,
                AverageDeaths: totalMatches > 0 ? totalDeaths / totalMatches : 0,
                AverageDamage: game === 'csgo' ? null : (totalRoundswithextendedstats > 0 ? totalDamage / totalRoundswithextendedstats : 0),
                WinRate: totalMatches > 0 ? totalWins / totalMatches : 0,
                AverageHeadshots: totalKills > 0 ? totalHeadshots / totalKills : 0,
                KillRatio: totalMatches > 0 ? totalKR / totalMatches : 0,
                KillDeaths: totalMatches > 0 ? totalKD / totalMatches : 0
            }
        };
    }

    function updateStats(stats, cardId, game) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const statMap = {
            'Kills': { value: stats.lifetime.Kills, formatter: v => Math.round(v).toString() },
            'ADR': { 
                value: stats.lifetime.AverageDamage, 
                formatter: v => v === null ? 'N/A' : parseFloat(v).toFixed(2) 
            },
            'K/D': { value: stats.lifetime.KillDeaths, formatter: v => parseFloat(v).toFixed(2) },
            'K/R': { value: stats.lifetime.KillRatio, formatter: v => parseFloat(v).toFixed(2) },
            'Win Rate': { value: stats.lifetime.WinRate * 100, formatter: v => parseFloat(v).toFixed(2) + '%' },
            'HS%': { value: stats.lifetime.AverageHeadshots * 100, formatter: v => parseFloat(v).toFixed(2) + '%' },
            'Avg Kills': { value: stats.lifetime.AverageKills, formatter: v => parseFloat(v).toFixed(2) },
            'Avg Deaths': { value: stats.lifetime.AverageDeaths, formatter: v => parseFloat(v).toFixed(2) },
            'Matches': { value: stats.lifetime.matches, formatter: v => Math.round(v).toString() }
        };

        Object.entries(statMap).forEach(([label, { value, formatter }]) => {
            const labelElements = card.querySelectorAll('.player-stats-label');
            labelElements.forEach(el => {
                if (el.textContent.trim() === label) {
                    const valueElement = el.nextElementSibling;
                    if (valueElement?.classList.contains('player-stats-value')) {
                        valueElement.textContent = formatter(value);
                    }
                }
            });
        });
    }

    function updateCardUI(cardId, playerData) {
        const card = document.getElementById(cardId);
        if (!card) return;

        // Обновляем основную информацию
        if (playerData.nickname) {
            const nameElement = card.querySelector('.card__name');
            if (nameElement) nameElement.textContent = playerData.nickname;
        }

        // Обновляем ELO
        const elo = playerData.games?.[playerData.game]?.faceit_elo || 0;
        const eloElement = card.querySelector('.elo-value');
        if (eloElement) eloElement.textContent = elo;

        // Обновляем уровень
        updateLevelImage(elo, cardId);

        // Обновляем аватар
        const avatar = card.querySelector('.card__img');
        if (avatar) {
            avatar.src = playerData.avatar || './images/default_avatar.png';
            avatar.onerror = () => {
                avatar.src = './images/default_avatar.png';
            };
        }

        // Обновляем ссылки
        const steamLink = card.querySelector('.steam-link');
        const faceitLink = card.querySelector('.faceit-link');
        
        if (steamLink && playerData.steam_id_64) {
            steamLink.href = `https://steamcommunity.com/profiles/${playerData.steam_id_64}`;
            steamLink.target = '_blank';
            steamLink.rel = 'noopener noreferrer';
        }
        
        if (faceitLink) {
            faceitLink.href = `https://www.faceit.com/ru/players/${playerData.nickname}`;
            faceitLink.target = '_blank';
            faceitLink.rel = 'noopener noreferrer';
        }

        // Обновляем статистику
        if (playerData.stats) {
            updateStats(playerData.stats, cardId, playerData.game);
            setTimeout(highlightBestStats, 100);
            // Скрываем ADR для CS:GO
            const statsContainer = card.querySelector('.player-stats');
            if (statsContainer) {
                const statElements = statsContainer.querySelectorAll('.player-stats-info');
                statElements.forEach(element => {
                    const label = element.querySelector('.player-stats-label');
                    if (label && label.textContent.trim() === 'ADR') {
                        element.style.display = playerData.game === 'csgo' ? 'none' : 'flex';
                    }
                });
            }
        }
    }

    function setupGameSwitchers() {
        document.querySelectorAll('.game-switch-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const cardId = this.dataset.player;
                const game = this.dataset.game;
                
                const card = document.getElementById(cardId);
                if (!card) return;

                // Обновляем активные кнопки
                card.querySelectorAll('.game-switch-btn').forEach(btn => {
                    btn.classList.toggle('active', btn === this);
                });

                const player = PLAYERS.find(p => p.cardId === cardId);
                if (!player) return;

                const playerData = await getPlayerData(player.nickname, game);
                if (playerData) {
                    updateCardUI(cardId, playerData);
                }
            });
        });
    }

    async function init() {
        await Promise.all(PLAYERS.map(async player => {
            const playerData = await getPlayerData(player.nickname, 'cs2');
            if (playerData) {
                updateCardUI(player.cardId, playerData);
            }
        }));

        setupGameSwitchers();
    }

    function highlightBestStats() {
        const cards = document.querySelectorAll('.card');
        const statsToCompare = [
            'Matches', 'Kills', 'ADR', 'K/D', 'K/R', 
            'Win Rate', 'HS%', 'Avg Kills', 'Avg Deaths'
        ];
    
        // Создаем объект для хранения максимальных значений
        const maxValues = {};
        statsToCompare.forEach(stat => {
            maxValues[stat] = -Infinity;
        });
    
        // 1. Находим максимальные значения по каждой статистике
        cards.forEach(card => {
            const statsContainer = card.querySelector('.player-stats');
            if (statsContainer) {
                statsContainer.querySelectorAll('.player-stats-info').forEach(statElement => {
                    const label = statElement.querySelector('.player-stats-label');
                    const valueElement = statElement.querySelector('.player-stats-value');
                    
                    if (label && valueElement && statsToCompare.includes(label.textContent.trim())) {
                        const statName = label.textContent.trim();
                        const valueText = valueElement.textContent
                            .replace('%', '')
                            .replace(',', '')
                            .trim();
                        
                        const value = parseFloat(valueText) || 0;
                        
                        // Обновляем максимальное значение
                        if (value > maxValues[statName]) {
                            maxValues[statName] = value;
                        }
                    }
                });
            }
        });
    
        // 2. Выделяем элементы с максимальными значениями
        cards.forEach(card => {
            const statsContainer = card.querySelector('.player-stats');
            if (statsContainer) {
                statsContainer.querySelectorAll('.player-stats-info').forEach(statElement => {
                    const label = statElement.querySelector('.player-stats-label');
                    const valueElement = statElement.querySelector('.player-stats-value');
                    
                    if (label && valueElement && statsToCompare.includes(label.textContent.trim())) {
                        const statName = label.textContent.trim();
                        const valueText = valueElement.textContent
                            .replace('%', '')
                            .replace(',', '')
                            .trim();
                        
                        const value = parseFloat(valueText) || 0;
                        
                        // Сбрасываем предыдущее выделение
                        label.classList.remove('best-stat');
                        valueElement.classList.remove('best-stat');
                        
                        // Выделяем, если значение максимальное и не нулевое
                        if (value === maxValues[statName] && value > 0) {
                            label.classList.add('best-stat');
                            valueElement.classList.add('best-stat');
                        }
                    }
                });
            }
        });
    }

    init();
});