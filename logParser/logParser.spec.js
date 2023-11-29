const LogParser = require('./logParser');

describe('logParser', () => {
    describe('parse()', () => {
        it('should parse a line of the log', () => {
            // Arrange
            const logParser = new LogParser();
            const log = `[Sun Nov 19 09:52:52 2023] Players on EverQuest:
            [Sun Nov 19 09:52:52 2023] ---------------------------
            [Sun Nov 19 09:52:52 2023] [ANONYMOUS] Arbusto
            [Sun Nov 19 09:52:52 2023] [ANONYMOUS] Julia  <Alianza>
            [Sun Nov 19 09:52:52 2023] [44 Monk] Santiwill (Dark Elf) <Alianza>
            [Sun Nov 19 09:52:52 2023] [49 Enchanter] Freddy (High Elf) <Alianza>
            [Sun Nov 19 09:52:52 2023] [37 Paladin] Luthor (Human) <Alianza>
            [Sun Nov 19 09:52:52 2023] [48 Warrior] Tank (Ogre) <Alianza>
            [Sun Nov 19 09:52:52 2023] There are 6 players in Kedge Keep.`;
            // Act
            const result = logParser.parse(log);
            // Assert
            expect(result.date).toBe(new Date('Sun Nov 19 09:52:52 2023').getTime());
            expect(result.characters).toEqual(['Arbusto', 'Julia', 'Santiwill', 'Freddy', 'Luthor', 'Tank']);
        });
    });
});