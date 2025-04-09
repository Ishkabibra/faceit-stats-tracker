document.addEventListener('DOMContentLoaded', async () => {
    const FACEIT_API_KEY = '91e26692-e309-4d7f-8b37-cc6ccd98c169';
    const FACEIT_API_URL = 'https://open.faceit.com/data/v4';
    
    // Массив игроков (можно добавить больше)
    const PLAYERS = [
        { nickname: '2Papa', cardId: 'player1' },
        { nickname: 'prankeRX', cardId: 'player2' },
        { nickname: 'TiltGod_', cardId: 'player3' },
        { nickname: 'li5t_', cardId: 'player4' },
        // { nickname: 'donk666', cardId: 'player5' }
    ];

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

    // Функции для парсинга значений
    function parseWinRate(rate) {
        if (rate === undefined || rate === null) return 0;
        if (typeof rate === 'number') return Math.min(1, Math.max(0, rate));
        if (typeof rate === 'string') {
            const num = parseFloat(rate.replace('%', '')) / 100;
            return isNaN(num) ? 0 : Math.min(1, Math.max(0, num));
        }
        return 0;
    }

    function parseHeadshotRate(rate) {
        if (rate === undefined || rate === null) return 0;
        if (typeof rate === 'number') return Math.min(1, Math.max(0, rate));
        if (typeof rate === 'string') {
            const num = parseFloat(rate.replace('%', '')) / 100;
            return isNaN(num) ? 0 : Math.min(1, Math.max(0, num));
        }
        return 0;
    }

    // Получение данных игрока
    async function getPlayerStats(nickname) {
        try {
            const response = await fetch(`${FACEIT_API_URL}/players?nickname=${encodeURIComponent(nickname)}`, {
                headers: {
                    'Authorization': `Bearer ${FACEIT_API_KEY}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error('Ошибка API:', response.status, await response.text());
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка сети:', error);
            return null;
        }
    }

    // Получение детальной статистики
    async function getPlayerStatsDetails(playerId) {
        try {
            const response = await fetch(`${FACEIT_API_URL}/players/${playerId}/stats/cs2`, {
                headers: {
                    'Authorization': `Bearer ${FACEIT_API_KEY}`
                }
            });
            
            if (!response.ok) {
                console.error('Ошибка API статистики:', response.status, await response.text());
                return null;
            }
            
            const cs2Data = await response.json();
            console.log('Полные данные CS2:', cs2Data);

            function sanitizeNumber(value) {
                if (value === undefined || value === null) return 0;
                if (typeof value === 'string') {
                    const cleaned = value.replace(/[^0-9.]/g, '');
                    return parseFloat(cleaned) || 0;
                }
                return value || 0;
            }

            // Используем данные из lifetime, если они есть
            const segments = cs2Data.segments || [];
            const lifetime = cs2Data.lifetime || {};

            let totalKills = 0;
            let totalDeaths = 0;
            let totalMatches = 0;
            let totalRounds = 0;
            let totalWins = 0;
            let totalHeadshots = 0;
            let totalDamage = 0;
            let totalRoundswithextendedstats = 0;

            // Если есть сегменты, суммируем их
            if (segments.length > 0) {
                totalKills = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Kills), 0);
                totalDeaths = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Deaths), 0);
                totalMatches = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Matches), 0);
                totalRounds = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Rounds), 0);
                totalWins = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Wins), 0);
                totalHeadshots = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.Headshots), 0);
                totalDamage = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["Total Damage"]), 0);
                totalKD = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["K/D Ratio"]), 0);
                totalKR = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["K/R Ratio"]), 0);
                totalRoundswithextendedstats = segments.reduce((sum, segment) => sum + sanitizeNumber(segment.stats?.["Total Rounds with extended stats"]), 0); //Рауды с записанной статистикой
            }

            const averageKills = totalMatches > 0 ? totalKills / totalMatches : 0;
            const averageDeaths = totalMatches > 0 ? totalDeaths / totalMatches : 0;
            const killRatio = totalRounds > 0 ? totalKR / totalMatches : 0;
            const killDeaths = totalMatches > 0 ? totalKD / totalMatches : 0;
            const winRate = totalMatches > 0 ? totalWins / totalMatches : 0;
            const averageHeadshots = totalMatches > 0 ? totalHeadshots / totalKills : 0;
            const averageDamage = totalMatches > 0 ? totalDamage / totalRoundswithextendedstats : 0;


            return {
                lifetime: {
                    matches: totalMatches,
                    Kills: totalKills,
                    Deaths: totalDeaths,
                    AverageKills: averageKills,
                    AverageDeaths: averageDeaths,
                    // AverageDamagePerRound: sanitizeNumber(lifetime.ADR),
                    AverageDamage: averageDamage,
                    WinRate: winRate,
                    AverageHeadshots: averageHeadshots,
                    KillRatio: killRatio, // добавляем расчет K/R
                    KillDeaths: killDeaths
                }
            };
        } catch (error) {
            console.error('Ошибка при получении статистики:', error);
            return null;
        }
    }

    // Обновленная функция highlightBestStats
    function highlightBestStats() {
        console.log("Запуск highlightBestStats...");
        
        const cards = document.querySelectorAll('.card'); // Все карточки игроков
        const statsToCompare = ['Matches', 'Kills', 'ADR', 'K/D', 'K/R', 'Win Rate', 'HS%', 'Avg Kills', 'Avg Deaths'];
        
        statsToCompare.forEach(stat => {
            const values = [];
            
            // 1. Собираем все значения
            cards.forEach(card => {
                const statsContainer = card.querySelector('.player-stats');
                if (statsContainer) {
                    const statElements = statsContainer.querySelectorAll('.player-stats-info');
                    statElements.forEach(statElement => {
                        const label = statElement.querySelector('.player-stats-label');
                        const valueElement = statElement.querySelector('.player-stats-value');
                        
                        if (label && label.textContent.trim() === stat && valueElement) {
                            const valueText = valueElement.textContent
                                .replace('%', '')
                                .replace(',', '')
                                .trim();
                            
                            const value = parseFloat(valueText) || 0;
                            values.push({
                                value: value,
                                element: valueElement,
                                label: label
                            });
                        }
                    });
                }
            });
            
            // 2. Находим максимальное значение
            if (values.length > 0) {
                const maxValue = Math.max(...values.map(v => v.value));
                console.log(`Статистика "${stat}": maxValue = ${maxValue}`);
                
                // 3. Выделяем лучшие
                values.forEach(item => {
                    if (item.value === maxValue && maxValue > 0) {
                        item.element.classList.add('best-stat');
                        item.label.classList.add('best-stat');
                    } else {
                        item.element.classList.remove('best-stat');
                        item.label.classList.remove('best-stat');
                    }
                });
            }
        });
    }

    // Обновление статистики в карточке
    function updateStats(stats, cardId) {
        const card = document.getElementById(cardId);
        if (!card) {
            console.error(`Карточка с ID ${cardId} не найдена`);
            return;
        }
    
        if (!stats?.lifetime) {
            console.error('Нет данных статистики');
            showPlaceholderStats(cardId);
            return;
        }
    
        const formatNumber = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? '0' : Math.round(num).toString();
        };
    
        const statMap = {
            'Kills': { value: stats.lifetime.Kills, formatter: formatNumber },
            'ADR': { value: stats.lifetime.AverageDamage, formatter: v => parseFloat(v).toFixed(2) },
            'K/D': { value: stats.lifetime.KillDeaths, formatter: v => parseFloat(v).toFixed(2) },
            'K/R': { value: stats.lifetime.KillRatio, formatter: v => parseFloat(v).toFixed(2) },
            'Win Rate': { value: stats.lifetime.WinRate * 100, formatter: v => parseFloat(v).toFixed(2) + '%' },
            'HS%': { value: stats.lifetime.AverageHeadshots * 100, formatter: v => parseFloat(v).toFixed(2) + '%' },
            'Deaths': { value: stats.lifetime.Deaths, formatter: formatNumber },
            'Avg Kills': { value: stats.lifetime.AverageKills, formatter: v => parseFloat(v).toFixed(2) },
            'Avg Deaths': { value: stats.lifetime.AverageDeaths, formatter: v => parseFloat(v).toFixed(2) },
            'Matches': { value: stats.lifetime.matches, formatter: formatNumber }
        };
    
        Object.entries(statMap).forEach(([label, { value, formatter }]) => {
            const labelElements = card.querySelectorAll('.player-stats-label');
            labelElements.forEach(el => {
                if (el.textContent.trim() === label) {
                    const valueElement = el.nextElementSibling;
                    if (valueElement?.classList.contains('player-stats-value')) {
                        try {
                            valueElement.textContent = formatter(value);
                        } catch (error) {
                            console.error(`Ошибка отображения ${label}:`, error);
                            valueElement.textContent = 'N/A';
                        }
                    }
                }
            });
        });
        
        // Вызываем функцию выделения лучших статистик после обновления
        setTimeout(highlightBestStats, 100);
    }

    // Заглушки для отсутствующих данных
    function showPlaceholderStats(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const placeholders = {
            'Kills': '0',
            'ADR': '0.00',
            'K/D': '0.00',
            'K/R': '0.00',
            'Win Rate': '0.00%',
            'HS%': '0.00%',
            'Deaths': '0',
            'Avg Kills': '0.00',
            'Avg Deaths': '0.00',
            'Matches': '0'
        };

        Object.entries(placeholders).forEach(([label, value]) => {
            const labelElements = card.querySelectorAll('.player-stats-label');
            labelElements.forEach(el => {
                if (el.textContent.trim() === label) {
                    const valueElement = el.nextElementSibling;
                    if (valueElement?.classList.contains('player-stats-value')) {
                        valueElement.textContent = value;
                    }
                }
            });
        });
    }

    // Обновление изображения уровня
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

    // Загрузка данных для одного игрока
    async function loadPlayerData(player) {
        try {
            console.log(`Загрузка данных для ${player.nickname}...`);
            const playerData = await getPlayerStats(player.nickname);
            
            if (!playerData) {
                console.error(`Не удалось получить данные игрока ${player.nickname}`);
                showPlaceholderStats(player.cardId);
                return;
            }

            // Обновление основной информации
            const card = document.getElementById(player.cardId);
            if (card) {
                const nameElement = card.querySelector('.card__name');
                if (nameElement) nameElement.textContent = playerData.nickname;
                
                // ELO и уровень
                const elo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;
                const eloElement = card.querySelector('.elo-value');
                if (eloElement) eloElement.textContent = elo;
                updateLevelImage(elo, player.cardId);

                // Аватар
                const avatar = card.querySelector('.card__img');
                 if (avatar) {
                    if (!playerData.avatar || playerData.avatar === '') {
                        avatar.src = './images/default_avatar.png';
                    } else {
                        avatar.src = playerData.avatar;
                    }
                    avatar.onerror = () => {
                        avatar.src = './images/default_avatar.png';
                    };
            }
                const steamLink = card.querySelector('.card__link.steam-link');
                const faceitLink = card.querySelector('.card__link.faceit-link');
                
                if (steamLink && playerData.steam_id_64) {
                    steamLink.href = `https://steamcommunity.com/profiles/${playerData.steam_id_64}`;
                    steamLink.target = '_blank'; // Открывать в новой вкладке
                    steamLink.rel = 'noopener noreferrer'; // Безопасность
                }
                
                if (faceitLink) {
                    faceitLink.href = `https://www.faceit.com/ru/players/${playerData.nickname}`;
                    faceitLink.target = '_blank';
                    faceitLink.rel = 'noopener noreferrer';
                }
            }

            // Получение статистики
            const statsData = await getPlayerStatsDetails(playerData.player_id);
            if (statsData) {
                updateStats(statsData, player.cardId);
            } else {
                console.warn(`Не удалось получить статистику для ${player.nickname}`);
                showPlaceholderStats(player.cardId);
            }
        } catch (error) {
            console.error(`Ошибка при загрузке данных для ${player.nickname}:`, error);
            showPlaceholderStats(player.cardId);
        }
    }

    // Загрузка данных для всех игроков
    async function loadAllPlayersData() {
        try {
            await Promise.all(PLAYERS.map(player => loadPlayerData(player)));
            console.log('Данные загружены');
            setTimeout(highlightBestStats, 300); // Даем время на рендеринг
        } catch (error) {
            console.error('Ошибка загрузки:', error);
    }
}

    // Запуск загрузки данных
    loadAllPlayersData();
});