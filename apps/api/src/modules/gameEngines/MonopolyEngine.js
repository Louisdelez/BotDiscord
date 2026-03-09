// Monopoly — French classic board (40 spaces)
// Server-side CommonJS copy of the frontend MonopolyEngine

// ─── Data (inlined from MonopolyData.js) ───────────────────────────────────

const STARTING_MONEY = 1500;
const GO_SALARY = 200;
const JAIL_FINE = 50;
const MAX_JAIL_TURNS = 3;
const TOTAL_HOUSES = 32;
const TOTAL_HOTELS = 12;

const COLOR_GROUPS = {
  brown:  { color: '#8B4513', spaces: [1, 3] },
  cyan:   { color: '#00CED1', spaces: [6, 8, 9] },
  pink:   { color: '#FF69B4', spaces: [11, 13, 14] },
  orange: { color: '#FF8C00', spaces: [16, 18, 19] },
  red:    { color: '#FF0000', spaces: [21, 23, 24] },
  yellow: { color: '#FFD700', spaces: [26, 27, 29] },
  green:  { color: '#008000', spaces: [31, 32, 34] },
  blue:   { color: '#0000CD', spaces: [37, 39] },
};

const SPACES = [
  { index: 0,  type: 'go',           name: 'Départ' },
  { index: 1,  type: 'property',     name: 'Boulevard de Belleville',     color: '#8B4513', price: 60,  rents: [2, 10, 30, 90, 160, 250],     houseCost: 50,  mortgage: 30,  group: 'brown' },
  { index: 2,  type: 'community',    name: 'Caisse de Communauté' },
  { index: 3,  type: 'property',     name: 'Rue Lecourbe',                color: '#8B4513', price: 60,  rents: [4, 20, 60, 180, 320, 450],    houseCost: 50,  mortgage: 30,  group: 'brown' },
  { index: 4,  type: 'tax',          name: 'Impôts sur le revenu',        amount: 200 },
  { index: 5,  type: 'railroad',     name: 'Gare Montparnasse',           price: 200, mortgage: 100 },
  { index: 6,  type: 'property',     name: 'Rue de Vaugirard',            color: '#00CED1', price: 100, rents: [6, 30, 90, 270, 400, 550],    houseCost: 50,  mortgage: 50,  group: 'cyan' },
  { index: 7,  type: 'chance',       name: 'Chance' },
  { index: 8,  type: 'property',     name: 'Rue de Courcelles',           color: '#00CED1', price: 100, rents: [6, 30, 90, 270, 400, 550],    houseCost: 50,  mortgage: 50,  group: 'cyan' },
  { index: 9,  type: 'property',     name: 'Avenue de la République',     color: '#00CED1', price: 120, rents: [8, 40, 100, 300, 450, 600],   houseCost: 50,  mortgage: 60,  group: 'cyan' },
  { index: 10, type: 'jail-visit',   name: 'Prison (Visite)' },
  { index: 11, type: 'property',     name: 'Boulevard de la Villette',    color: '#FF69B4', price: 140, rents: [10, 50, 150, 450, 625, 750],  houseCost: 100, mortgage: 70,  group: 'pink' },
  { index: 12, type: 'utility',      name: 'Compagnie de distribution d\'électricité', price: 150, mortgage: 75 },
  { index: 13, type: 'property',     name: 'Avenue de Neuilly',           color: '#FF69B4', price: 140, rents: [10, 50, 150, 450, 625, 750],  houseCost: 100, mortgage: 70,  group: 'pink' },
  { index: 14, type: 'property',     name: 'Rue de Paradis',              color: '#FF69B4', price: 160, rents: [12, 60, 180, 500, 700, 900],  houseCost: 100, mortgage: 80,  group: 'pink' },
  { index: 15, type: 'railroad',     name: 'Gare de Lyon',                price: 200, mortgage: 100 },
  { index: 16, type: 'property',     name: 'Avenue Mozart',               color: '#FF8C00', price: 180, rents: [14, 70, 200, 550, 750, 950],  houseCost: 100, mortgage: 90,  group: 'orange' },
  { index: 17, type: 'community',    name: 'Caisse de Communauté' },
  { index: 18, type: 'property',     name: 'Boulevard Saint-Michel',      color: '#FF8C00', price: 180, rents: [14, 70, 200, 550, 750, 950],  houseCost: 100, mortgage: 90,  group: 'orange' },
  { index: 19, type: 'property',     name: 'Place Pigalle',               color: '#FF8C00', price: 200, rents: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100, group: 'orange' },
  { index: 20, type: 'free-parking', name: 'Parc Gratuit' },
  { index: 21, type: 'property',     name: 'Avenue Matignon',             color: '#FF0000', price: 220, rents: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110, group: 'red' },
  { index: 22, type: 'chance',       name: 'Chance' },
  { index: 23, type: 'property',     name: 'Boulevard Malesherbes',       color: '#FF0000', price: 220, rents: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110, group: 'red' },
  { index: 24, type: 'property',     name: 'Avenue Henri-Martin',         color: '#FF0000', price: 240, rents: [20, 100, 300, 750, 925, 1100],houseCost: 150, mortgage: 120, group: 'red' },
  { index: 25, type: 'railroad',     name: 'Gare du Nord',                price: 200, mortgage: 100 },
  { index: 26, type: 'property',     name: 'Faubourg Saint-Honoré',       color: '#FFD700', price: 260, rents: [22, 110, 330, 800, 975, 1150],houseCost: 150, mortgage: 130, group: 'yellow' },
  { index: 27, type: 'property',     name: 'Place de la Bourse',          color: '#FFD700', price: 260, rents: [22, 110, 330, 800, 975, 1150],houseCost: 150, mortgage: 130, group: 'yellow' },
  { index: 28, type: 'utility',      name: 'Compagnie de distribution des eaux', price: 150, mortgage: 75 },
  { index: 29, type: 'property',     name: 'Rue La Fayette',              color: '#FFD700', price: 280, rents: [24, 120, 360, 850, 1025, 1200],houseCost: 150, mortgage: 140, group: 'yellow' },
  { index: 30, type: 'go-to-jail',   name: 'Allez en Prison' },
  { index: 31, type: 'property',     name: 'Avenue de Breteuil',          color: '#008000', price: 300, rents: [26, 130, 390, 900, 1100, 1275],houseCost: 200, mortgage: 150, group: 'green' },
  { index: 32, type: 'property',     name: 'Avenue Foch',                 color: '#008000', price: 300, rents: [26, 130, 390, 900, 1100, 1275],houseCost: 200, mortgage: 150, group: 'green' },
  { index: 33, type: 'community',    name: 'Caisse de Communauté' },
  { index: 34, type: 'property',     name: 'Boulevard des Capucines',     color: '#008000', price: 320, rents: [28, 150, 450, 1000, 1200, 1400],houseCost: 200, mortgage: 160, group: 'green' },
  { index: 35, type: 'railroad',     name: 'Gare Saint-Lazare',           price: 200, mortgage: 100 },
  { index: 36, type: 'chance',       name: 'Chance' },
  { index: 37, type: 'property',     name: 'Avenue des Champs-Élysées',   color: '#0000CD', price: 350, rents: [35, 175, 500, 1100, 1300, 1500],houseCost: 200, mortgage: 175, group: 'blue' },
  { index: 38, type: 'tax',          name: 'Taxe de Luxe',                amount: 100 },
  { index: 39, type: 'property',     name: 'Rue de la Paix',              color: '#0000CD', price: 400, rents: [50, 200, 600, 1400, 1700, 2000],houseCost: 200, mortgage: 200, group: 'blue' },
];

const RAILROAD_INDICES = [5, 15, 25, 35];
const UTILITY_INDICES = [12, 28];

const CHANCE_CARDS = [
  { id: 'ch1',  type: 'move',        text: 'Avancez jusqu\'au Départ (recevez 200€)',              destination: 0 },
  { id: 'ch2',  type: 'move',        text: 'Avancez jusqu\'à l\'Avenue Henri-Martin',              destination: 24 },
  { id: 'ch3',  type: 'move',        text: 'Avancez jusqu\'au Boulevard de la Villette',           destination: 11 },
  { id: 'ch4',  type: 'move-util',   text: 'Avancez jusqu\'à la Compagnie la plus proche' },
  { id: 'ch5',  type: 'move-rr',     text: 'Avancez jusqu\'à la Gare la plus proche' },
  { id: 'ch6',  type: 'move-rr',     text: 'Avancez jusqu\'à la Gare la plus proche' },
  { id: 'ch7',  type: 'collect',     text: 'La banque vous verse un dividende de 50€',             amount: 50 },
  { id: 'ch8',  type: 'jail-free',   text: 'Vous êtes libéré de prison — gardez cette carte' },
  { id: 'ch9',  type: 'back3',       text: 'Reculez de 3 cases' },
  { id: 'ch10', type: 'go-jail',     text: 'Allez en Prison directement' },
  { id: 'ch11', type: 'pay-repairs', text: 'Réparations : payez 25€ par maison et 100€ par hôtel', perHouse: 25, perHotel: 100 },
  { id: 'ch12', type: 'pay',         text: 'Amende pour excès de vitesse : payez 15€',             amount: 15 },
  { id: 'ch13', type: 'move',        text: 'Avancez jusqu\'à la Gare de Lyon',                     destination: 15 },
  { id: 'ch14', type: 'move',        text: 'Avancez jusqu\'à la Rue de la Paix',                   destination: 39 },
  { id: 'ch15', type: 'pay-all',     text: 'Vous êtes élu président — payez 50€ à chaque joueur',  amount: 50 },
  { id: 'ch16', type: 'collect',     text: 'Votre immeuble rapporte — recevez 150€',               amount: 150 },
];

const COMMUNITY_CARDS = [
  { id: 'cc1',  type: 'move',        text: 'Avancez jusqu\'au Départ (recevez 200€)',              destination: 0 },
  { id: 'cc2',  type: 'collect',     text: 'Erreur de la banque en votre faveur — recevez 200€',   amount: 200 },
  { id: 'cc3',  type: 'pay',         text: 'Frais médicaux — payez 50€',                           amount: 50 },
  { id: 'cc4',  type: 'collect',     text: 'Vente de votre stock — recevez 50€',                   amount: 50 },
  { id: 'cc5',  type: 'jail-free',   text: 'Vous êtes libéré de prison — gardez cette carte' },
  { id: 'cc6',  type: 'go-jail',     text: 'Allez en Prison directement' },
  { id: 'cc7',  type: 'collect',     text: 'Fête d\'anniversaire — recevez 10€ de chaque joueur',  amount: 10, subtype: 'collect-all' },
  { id: 'cc8',  type: 'collect',     text: 'Remboursement d\'impôts — recevez 20€',                amount: 20 },
  { id: 'cc9',  type: 'collect',     text: 'Assurance vie — recevez 100€',                         amount: 100 },
  { id: 'cc10', type: 'pay',         text: 'Frais de scolarité — payez 50€',                       amount: 50 },
  { id: 'cc11', type: 'collect',     text: 'Honoraires de consultation — recevez 25€',             amount: 25 },
  { id: 'cc12', type: 'pay-repairs', text: 'Réparations de rue : payez 40€ par maison et 115€ par hôtel', perHouse: 40, perHotel: 115 },
  { id: 'cc13', type: 'collect',     text: 'Vous avez gagné le second prix de beauté — recevez 10€', amount: 10 },
  { id: 'cc14', type: 'collect',     text: 'Héritage — recevez 100€',                              amount: 100 },
  { id: 'cc15', type: 'pay',         text: 'Frais d\'hospitalisation — payez 100€',                amount: 100 },
  { id: 'cc16', type: 'pay',         text: 'Cotisation d\'assurance — payez 50€',                  amount: 50 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

class MonopolyEngine {
  constructor(playerCount) {
    this.playerCount = playerCount;
    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        index: i,
        money: STARTING_MONEY,
        position: 0,
        inJail: false,
        jailTurns: 0,
        jailFreeCards: 0,
        bankrupt: false,
        properties: [],
      });
    }
    this.properties = {};
    this.chanceDeck = shuffle(CHANCE_CARDS.filter(c => c.type !== 'jail-free'));
    this.communityDeck = shuffle(COMMUNITY_CARDS.filter(c => c.type !== 'jail-free'));
    this.chanceJailFreeOut = false;
    this.communityJailFreeOut = false;
    this.currentPlayer = 0;
    this.dice = [0, 0];
    this.diceRolled = false;
    this.doublesCount = 0;
    this.turnPhase = 'roll'; // roll | action | buy | auction | card | jail | end | bankrupt
    this.pendingCard = null;
    this.pendingBuy = null;
    this.pendingAuction = null;
    this.pendingTrade = null;
    this.pendingBankruptcy = null;
    this.housesInBank = TOTAL_HOUSES;
    this.hotelsInBank = TOTAL_HOTELS;
    this.gameOver = false;
    this.winner = null;
    this.history = [];
    this.log = [];
  }

  // --- Serialize (all public state — Monopoly has no hidden info) ---

  serialize() {
    return {
      players: this.players,
      properties: this.properties,
      currentPlayer: this.currentPlayer,
      phase: this.turnPhase,
      gameOver: this.gameOver,
      winner: this.winner,
      dice: this.dice,
      diceRolled: this.diceRolled,
      doublesCount: this.doublesCount,
      pendingCard: this.pendingCard,
      pendingBuy: this.pendingBuy,
      pendingAuction: this.pendingAuction,
      pendingTrade: this.pendingTrade,
      pendingBankruptcy: this.pendingBankruptcy,
      housesInBank: this.housesInBank,
      hotelsInBank: this.hotelsInBank,
      chanceJailFreeOut: this.chanceJailFreeOut,
      communityJailFreeOut: this.communityJailFreeOut,
      log: this.log,
      playerCount: this.players.length,
    };
  }

  // --- Snapshot / Undo ---

  saveSnapshot() {
    this.history.push(JSON.stringify({
      players: this.players,
      properties: this.properties,
      currentPlayer: this.currentPlayer,
      dice: this.dice,
      diceRolled: this.diceRolled,
      doublesCount: this.doublesCount,
      turnPhase: this.turnPhase,
      pendingCard: this.pendingCard,
      pendingBuy: this.pendingBuy,
      pendingAuction: this.pendingAuction,
      pendingTrade: this.pendingTrade,
      pendingBankruptcy: this.pendingBankruptcy,
      housesInBank: this.housesInBank,
      hotelsInBank: this.hotelsInBank,
      gameOver: this.gameOver,
      winner: this.winner,
      chanceDeck: this.chanceDeck,
      communityDeck: this.communityDeck,
      chanceJailFreeOut: this.chanceJailFreeOut,
      communityJailFreeOut: this.communityJailFreeOut,
    }));
  }

  undo() {
    if (this.history.length === 0) return false;
    const snap = JSON.parse(this.history.pop());
    Object.assign(this, snap);
    return true;
  }

  // --- Dice ---

  rollDice() {
    const player = this.players[this.currentPlayer];
    if (this.turnPhase !== 'roll' || player.bankrupt) return false;

    this.saveSnapshot();

    if (player.inJail) {
      return this._rollForJail();
    }

    this.dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    this.diceRolled = true;
    const isDoubles = this.dice[0] === this.dice[1];

    if (isDoubles) {
      this.doublesCount++;
      if (this.doublesCount >= 3) {
        this._sendToJail();
        this.log.push({ type: 'jail', player: this.currentPlayer, reason: 'triples' });
        return true;
      }
    }

    const total = this.dice[0] + this.dice[1];
    this._movePlayer(player, total);
    return true;
  }

  _movePlayer(player, steps) {
    const oldPos = player.position;
    player.position = (player.position + steps) % 40;

    // Passed GO
    if (player.position < oldPos) {
      player.money += GO_SALARY;
      this.log.push({ type: 'go', player: player.index, amount: GO_SALARY });
    }

    this._landOn(player);
  }

  _movePlayerTo(player, destination, collectGo = true) {
    const oldPos = player.position;
    player.position = destination;

    if (collectGo && destination < oldPos) {
      player.money += GO_SALARY;
      this.log.push({ type: 'go', player: player.index, amount: GO_SALARY });
    }

    this._landOn(player);
  }

  _landOn(player) {
    const space = SPACES[player.position];
    this.log.push({ type: 'land', player: player.index, space: player.position, name: space.name });

    switch (space.type) {
      case 'go':
        this.turnPhase = 'end';
        break;

      case 'property':
      case 'railroad':
      case 'utility': {
        const prop = this.properties[space.index];
        if (!prop) {
          // Unowned
          if (player.money >= space.price) {
            this.pendingBuy = space.index;
            this.turnPhase = 'buy';
          } else {
            this._startAuction(space.index);
          }
        } else if (prop.owner !== player.index && !prop.mortgaged && !this.players[prop.owner].bankrupt) {
          // Pay rent
          const rent = this._calculateRent(space, this.dice[0] + this.dice[1]);
          this._payRent(player, this.players[prop.owner], rent);
        } else {
          this.turnPhase = 'end';
        }
        break;
      }

      case 'tax':
        player.money -= space.amount;
        this.log.push({ type: 'tax', player: player.index, amount: space.amount });
        if (player.money < 0) {
          this.pendingBankruptcy = { creditor: null, amount: -player.money };
          this.turnPhase = 'bankrupt';
        } else {
          this.turnPhase = 'end';
        }
        break;

      case 'chance':
        this._drawCard('chance');
        break;

      case 'community':
        this._drawCard('community');
        break;

      case 'go-to-jail':
        this._sendToJail();
        this.log.push({ type: 'jail', player: player.index, reason: 'space' });
        break;

      case 'jail-visit':
      case 'free-parking':
        this.turnPhase = 'end';
        break;

      default:
        this.turnPhase = 'end';
    }
  }

  // --- Cards ---

  _drawCard(type) {
    const player = this.players[this.currentPlayer];
    let card;

    if (type === 'chance') {
      if (this.chanceDeck.length === 0) {
        this.chanceDeck = shuffle(CHANCE_CARDS.filter(c => c.type !== 'jail-free'));
      }
      card = this.chanceDeck.shift();
    } else {
      if (this.communityDeck.length === 0) {
        this.communityDeck = shuffle(COMMUNITY_CARDS.filter(c => c.type !== 'jail-free'));
      }
      card = this.communityDeck.shift();
    }

    // Check if we need to give a jail-free card
    if (type === 'chance' && !this.chanceJailFreeOut) {
      // 1 in (remaining+1) chance to draw jail-free
      const jailFreeCard = CHANCE_CARDS.find(c => c.type === 'jail-free');
      if (Math.random() < 1 / (this.chanceDeck.length + 2)) {
        this.chanceDeck.unshift(card); // put drawn card back
        card = jailFreeCard;
      }
    } else if (type === 'community' && !this.communityJailFreeOut) {
      const jailFreeCard = COMMUNITY_CARDS.find(c => c.type === 'jail-free');
      if (Math.random() < 1 / (this.communityDeck.length + 2)) {
        this.communityDeck.unshift(card);
        card = jailFreeCard;
      }
    }

    this.pendingCard = card;
    this.turnPhase = 'card';
    this.log.push({ type: 'card', player: player.index, card: card.text });
  }

  resolveCard() {
    if (this.turnPhase !== 'card' || !this.pendingCard) return false;
    const card = this.pendingCard;
    const player = this.players[this.currentPlayer];
    this.pendingCard = null;

    switch (card.type) {
      case 'move':
        this._movePlayerTo(player, card.destination);
        return true;

      case 'move-rr': {
        const pos = player.position;
        let nearest = RAILROAD_INDICES.find(r => r > pos);
        if (!nearest) nearest = RAILROAD_INDICES[0];
        this._movePlayerTo(player, nearest);
        return true;
      }

      case 'move-util': {
        const pos = player.position;
        let nearest = UTILITY_INDICES.find(u => u > pos);
        if (!nearest) nearest = UTILITY_INDICES[0];
        this._movePlayerTo(player, nearest);
        return true;
      }

      case 'collect':
        if (card.subtype === 'collect-all') {
          const activePlayers = this.players.filter(p => !p.bankrupt && p.index !== player.index);
          activePlayers.forEach(p => {
            p.money -= card.amount;
            player.money += card.amount;
          });
        } else {
          player.money += card.amount;
        }
        this.turnPhase = 'end';
        return true;

      case 'pay':
        player.money -= card.amount;
        if (player.money < 0) {
          this.pendingBankruptcy = { creditor: null, amount: -player.money };
          this.turnPhase = 'bankrupt';
        } else {
          this.turnPhase = 'end';
        }
        return true;

      case 'pay-all': {
        const active = this.players.filter(p => !p.bankrupt && p.index !== player.index);
        const total = card.amount * active.length;
        player.money -= total;
        active.forEach(p => { p.money += card.amount; });
        if (player.money < 0) {
          this.pendingBankruptcy = { creditor: null, amount: -player.money };
          this.turnPhase = 'bankrupt';
        } else {
          this.turnPhase = 'end';
        }
        return true;
      }

      case 'jail-free':
        player.jailFreeCards++;
        if (card.id.startsWith('ch')) this.chanceJailFreeOut = true;
        else this.communityJailFreeOut = true;
        this.turnPhase = 'end';
        return true;

      case 'back3':
        player.position = (player.position - 3 + 40) % 40;
        this._landOn(player);
        return true;

      case 'go-jail':
        this._sendToJail();
        return true;

      case 'pay-repairs': {
        let cost = 0;
        player.properties.forEach(si => {
          const prop = this.properties[si];
          if (prop && prop.houses > 0) {
            if (prop.houses === 5) cost += card.perHotel;
            else cost += card.perHouse * prop.houses;
          }
        });
        player.money -= cost;
        this.log.push({ type: 'repairs', player: player.index, amount: cost });
        if (player.money < 0) {
          this.pendingBankruptcy = { creditor: null, amount: -player.money };
          this.turnPhase = 'bankrupt';
        } else {
          this.turnPhase = 'end';
        }
        return true;
      }

      default:
        this.turnPhase = 'end';
        return true;
    }
  }

  // --- Buying ---

  buyProperty() {
    if (this.turnPhase !== 'buy' || this.pendingBuy === null) return false;
    this.saveSnapshot();

    const spaceIndex = this.pendingBuy;
    const space = SPACES[spaceIndex];
    const player = this.players[this.currentPlayer];

    if (player.money < space.price) return false;

    player.money -= space.price;
    player.properties.push(spaceIndex);
    this.properties[spaceIndex] = { owner: player.index, houses: 0, mortgaged: false };
    this.pendingBuy = null;
    this.turnPhase = 'end';
    this.log.push({ type: 'buy', player: player.index, space: spaceIndex, price: space.price });
    return true;
  }

  declineBuy() {
    if (this.turnPhase !== 'buy' || this.pendingBuy === null) return false;
    this.saveSnapshot();
    this._startAuction(this.pendingBuy);
    this.pendingBuy = null;
    return true;
  }

  // --- Auctions ---

  _startAuction(spaceIndex) {
    const activePlayers = this.players.filter(p => !p.bankrupt).map(p => p.index);
    this.pendingAuction = {
      spaceIndex,
      currentBid: 0,
      currentBidder: null,
      participants: activePlayers,
      passed: [],
    };
    this.turnPhase = 'auction';
  }

  auctionBid(playerIndex, amount) {
    if (this.turnPhase !== 'auction' || !this.pendingAuction) return false;
    const auction = this.pendingAuction;
    const player = this.players[playerIndex];

    if (amount <= auction.currentBid || amount > player.money) return false;
    if (auction.passed.includes(playerIndex)) return false;

    this.saveSnapshot();
    auction.currentBid = amount;
    auction.currentBidder = playerIndex;
    return true;
  }

  auctionPass(playerIndex) {
    if (this.turnPhase !== 'auction' || !this.pendingAuction) return false;
    const auction = this.pendingAuction;
    if (auction.passed.includes(playerIndex)) return false;

    this.saveSnapshot();
    auction.passed.push(playerIndex);

    // Check if auction is over
    const remaining = auction.participants.filter(p => !auction.passed.includes(p));
    if (remaining.length <= 1) {
      this._resolveAuction();
    }
    return true;
  }

  _resolveAuction() {
    const auction = this.pendingAuction;
    if (!auction) return;

    if (auction.currentBidder !== null) {
      const winner = this.players[auction.currentBidder];
      const space = SPACES[auction.spaceIndex];
      winner.money -= auction.currentBid;
      winner.properties.push(auction.spaceIndex);
      this.properties[auction.spaceIndex] = { owner: winner.index, houses: 0, mortgaged: false };
      this.log.push({ type: 'auction-win', player: winner.index, space: auction.spaceIndex, price: auction.currentBid });
    }

    this.pendingAuction = null;
    this.turnPhase = 'end';
  }

  // --- Rent ---

  _calculateRent(space, diceTotal) {
    const prop = this.properties[space.index];
    if (!prop || prop.mortgaged) return 0;

    if (space.type === 'railroad') {
      const ownedRR = RAILROAD_INDICES.filter(ri => {
        const p = this.properties[ri];
        return p && p.owner === prop.owner && !p.mortgaged;
      }).length;
      return 25 * Math.pow(2, ownedRR - 1);
    }

    if (space.type === 'utility') {
      const ownedUtil = UTILITY_INDICES.filter(ui => {
        const p = this.properties[ui];
        return p && p.owner === prop.owner && !p.mortgaged;
      }).length;
      return ownedUtil === 1 ? 4 * diceTotal : 10 * diceTotal;
    }

    // Property
    if (prop.houses > 0) {
      return space.rents[prop.houses]; // houses 1-4, index 5 = hotel
    }

    // No houses — check monopoly
    if (this.hasMonopoly(prop.owner, space.group)) {
      return space.rents[0] * 2;
    }

    return space.rents[0];
  }

  _payRent(tenant, landlord, amount) {
    tenant.money -= amount;
    landlord.money += amount;
    this.log.push({ type: 'rent', from: tenant.index, to: landlord.index, amount });

    if (tenant.money < 0) {
      this.pendingBankruptcy = { creditor: landlord.index, amount: -tenant.money };
      this.turnPhase = 'bankrupt';
    } else {
      this.turnPhase = 'end';
    }
  }

  // --- Construction ---

  hasMonopoly(playerIndex, group) {
    if (!group || !COLOR_GROUPS[group]) return false;
    return COLOR_GROUPS[group].spaces.every(si => {
      const p = this.properties[si];
      return p && p.owner === playerIndex && !p.mortgaged;
    });
  }

  canBuildHouse(playerIndex, spaceIndex) {
    const space = SPACES[spaceIndex];
    if (!space || space.type !== 'property') return false;
    const prop = this.properties[spaceIndex];
    if (!prop || prop.owner !== playerIndex || prop.mortgaged) return false;
    if (!this.hasMonopoly(playerIndex, space.group)) return false;
    if (prop.houses >= 5) return false;

    // Check uniform building rule (max 1 house difference in group)
    const groupSpaces = COLOR_GROUPS[space.group].spaces;
    const minHouses = Math.min(...groupSpaces.map(si => ((this.properties[si] && this.properties[si].houses) || 0)));
    if (prop.houses > minHouses) return false;

    // Check if any property in group is mortgaged
    if (groupSpaces.some(si => this.properties[si] && this.properties[si].mortgaged)) return false;

    // Check bank supply
    if (prop.houses === 4) {
      return this.hotelsInBank > 0;
    }
    return this.housesInBank > 0;
  }

  buildHouse(playerIndex, spaceIndex) {
    if (!this.canBuildHouse(playerIndex, spaceIndex)) return false;
    const space = SPACES[spaceIndex];
    const player = this.players[playerIndex];
    if (player.money < space.houseCost) return false;

    this.saveSnapshot();
    const prop = this.properties[spaceIndex];

    if (prop.houses === 4) {
      // Upgrade to hotel
      prop.houses = 5;
      this.hotelsInBank--;
      this.housesInBank += 4; // Return 4 houses
    } else {
      prop.houses++;
      this.housesInBank--;
    }

    player.money -= space.houseCost;
    this.log.push({ type: 'build', player: playerIndex, space: spaceIndex, houses: prop.houses });
    return true;
  }

  canSellHouse(playerIndex, spaceIndex) {
    const space = SPACES[spaceIndex];
    if (!space || space.type !== 'property') return false;
    const prop = this.properties[spaceIndex];
    if (!prop || prop.owner !== playerIndex || prop.houses === 0) return false;

    // Check uniform selling rule
    const groupSpaces = COLOR_GROUPS[space.group].spaces;
    const maxHouses = Math.max(...groupSpaces.map(si => ((this.properties[si] && this.properties[si].houses) || 0)));
    if (prop.houses < maxHouses) return false;

    return true;
  }

  sellHouse(playerIndex, spaceIndex) {
    if (!this.canSellHouse(playerIndex, spaceIndex)) return false;
    this.saveSnapshot();

    const space = SPACES[spaceIndex];
    const player = this.players[playerIndex];
    const prop = this.properties[spaceIndex];

    if (prop.houses === 5) {
      // Downgrade from hotel
      if (this.housesInBank < 4) return false; // Need 4 houses to replace
      prop.houses = 4;
      this.hotelsInBank++;
      this.housesInBank -= 4;
    } else {
      prop.houses--;
      this.housesInBank++;
    }

    player.money += Math.floor(space.houseCost / 2);
    this.log.push({ type: 'sell-house', player: playerIndex, space: spaceIndex, houses: prop.houses });
    return true;
  }

  // --- Mortgage ---

  canMortgage(playerIndex, spaceIndex) {
    const prop = this.properties[spaceIndex];
    if (!prop || prop.owner !== playerIndex || prop.mortgaged) return false;

    // Cannot mortgage if any property in group has houses
    const space = SPACES[spaceIndex];
    if (space.type === 'property' && space.group) {
      const groupSpaces = COLOR_GROUPS[space.group].spaces;
      if (groupSpaces.some(si => ((this.properties[si] && this.properties[si].houses) || 0) > 0)) return false;
    }

    return true;
  }

  mortgageProperty(playerIndex, spaceIndex) {
    if (!this.canMortgage(playerIndex, spaceIndex)) return false;
    this.saveSnapshot();

    const space = SPACES[spaceIndex];
    const player = this.players[playerIndex];
    const prop = this.properties[spaceIndex];

    prop.mortgaged = true;
    player.money += space.mortgage;
    this.log.push({ type: 'mortgage', player: playerIndex, space: spaceIndex, amount: space.mortgage });
    return true;
  }

  unmortgageProperty(playerIndex, spaceIndex) {
    const prop = this.properties[spaceIndex];
    if (!prop || prop.owner !== playerIndex || !prop.mortgaged) return false;
    const space = SPACES[spaceIndex];
    const cost = Math.ceil(space.mortgage * 1.1); // 10% interest
    const player = this.players[playerIndex];
    if (player.money < cost) return false;

    this.saveSnapshot();
    prop.mortgaged = false;
    player.money -= cost;
    this.log.push({ type: 'unmortgage', player: playerIndex, space: spaceIndex, amount: cost });
    return true;
  }

  // --- Jail ---

  _sendToJail() {
    const player = this.players[this.currentPlayer];
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this.doublesCount = 0;
    this.turnPhase = 'end';
  }

  _rollForJail() {
    const player = this.players[this.currentPlayer];
    this.dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    this.diceRolled = true;

    if (this.dice[0] === this.dice[1]) {
      // Rolled doubles — free
      player.inJail = false;
      player.jailTurns = 0;
      this.doublesCount = 0;
      const total = this.dice[0] + this.dice[1];
      this._movePlayer(player, total);
      this.log.push({ type: 'jail-free-roll', player: player.index });
    } else {
      player.jailTurns++;
      if (player.jailTurns >= MAX_JAIL_TURNS) {
        // Must pay fine after 3 failed attempts
        player.money -= JAIL_FINE;
        player.inJail = false;
        player.jailTurns = 0;
        const total = this.dice[0] + this.dice[1];
        this._movePlayer(player, total);
        this.log.push({ type: 'jail-fine-forced', player: player.index, amount: JAIL_FINE });
      } else {
        this.turnPhase = 'end';
        this.log.push({ type: 'jail-stay', player: player.index, turns: player.jailTurns });
      }
    }
    return true;
  }

  payJailFine() {
    const player = this.players[this.currentPlayer];
    if (!player.inJail || this.turnPhase !== 'roll') return false;

    this.saveSnapshot();
    player.money -= JAIL_FINE;
    player.inJail = false;
    player.jailTurns = 0;
    this.log.push({ type: 'jail-fine', player: player.index, amount: JAIL_FINE });

    if (player.money < 0) {
      this.pendingBankruptcy = { creditor: null, amount: -player.money };
      this.turnPhase = 'bankrupt';
    }
    // Don't change turnPhase — player still needs to roll
    return true;
  }

  useJailFreeCard() {
    const player = this.players[this.currentPlayer];
    if (!player.inJail || player.jailFreeCards <= 0 || this.turnPhase !== 'roll') return false;

    this.saveSnapshot();
    player.jailFreeCards--;
    player.inJail = false;
    player.jailTurns = 0;

    // Return card to deck
    if (this.chanceJailFreeOut) {
      this.chanceJailFreeOut = false;
    } else if (this.communityJailFreeOut) {
      this.communityJailFreeOut = false;
    }

    this.log.push({ type: 'jail-free-card', player: player.index });
    // Player still needs to roll
    return true;
  }

  // --- Trade ---

  proposeTrade(fromIndex, toIndex, offer) {
    // offer: { propertiesFrom: [], propertiesTo: [], moneyFrom: 0, moneyTo: 0, jailCardsFrom: 0, jailCardsTo: 0 }
    const from = this.players[fromIndex];
    const to = this.players[toIndex];
    if (from.bankrupt || to.bankrupt) return false;

    // Validate
    if (offer.moneyFrom > from.money || offer.moneyTo > to.money) return false;
    if (offer.jailCardsFrom > from.jailFreeCards || offer.jailCardsTo > to.jailFreeCards) return false;

    // Properties must be owned and have no houses
    for (const si of (offer.propertiesFrom || [])) {
      const prop = this.properties[si];
      if (!prop || prop.owner !== fromIndex || prop.houses > 0) return false;
    }
    for (const si of (offer.propertiesTo || [])) {
      const prop = this.properties[si];
      if (!prop || prop.owner !== toIndex || prop.houses > 0) return false;
    }

    this.pendingTrade = { from: fromIndex, to: toIndex, offer };
    return true;
  }

  acceptTrade() {
    if (!this.pendingTrade) return false;
    this.saveSnapshot();

    const { from: fromIndex, to: toIndex, offer } = this.pendingTrade;
    const from = this.players[fromIndex];
    const to = this.players[toIndex];

    // Transfer money
    from.money -= (offer.moneyFrom || 0);
    to.money += (offer.moneyFrom || 0);
    to.money -= (offer.moneyTo || 0);
    from.money += (offer.moneyTo || 0);

    // Transfer jail free cards
    from.jailFreeCards -= (offer.jailCardsFrom || 0);
    to.jailFreeCards += (offer.jailCardsFrom || 0);
    to.jailFreeCards -= (offer.jailCardsTo || 0);
    from.jailFreeCards += (offer.jailCardsTo || 0);

    // Transfer properties
    for (const si of (offer.propertiesFrom || [])) {
      this.properties[si].owner = toIndex;
      from.properties = from.properties.filter(p => p !== si);
      to.properties.push(si);
    }
    for (const si of (offer.propertiesTo || [])) {
      this.properties[si].owner = fromIndex;
      to.properties = to.properties.filter(p => p !== si);
      from.properties.push(si);
    }

    this.log.push({ type: 'trade', from: fromIndex, to: toIndex });
    this.pendingTrade = null;
    return true;
  }

  rejectTrade() {
    this.pendingTrade = null;
    return true;
  }

  // --- Bankruptcy ---

  declareBankruptcy() {
    const player = this.players[this.currentPlayer];
    if (!this.pendingBankruptcy && player.money >= 0) return false;

    this.saveSnapshot();
    player.bankrupt = true;

    const creditor = this.pendingBankruptcy ? this.pendingBankruptcy.creditor : null;

    if (creditor !== null && creditor !== undefined) {
      // Transfer assets to creditor
      const cred = this.players[creditor];
      for (const si of player.properties) {
        this.properties[si].owner = creditor;
        cred.properties.push(si);
        // If mortgaged, creditor must pay 10% immediately or unmortgage
      }
      cred.money += Math.max(0, player.money + ((this.pendingBankruptcy && this.pendingBankruptcy.amount) || 0));
      cred.jailFreeCards += player.jailFreeCards;
    } else {
      // Return to bank
      for (const si of player.properties) {
        const prop = this.properties[si];
        if (prop.houses > 0) {
          if (prop.houses === 5) this.hotelsInBank++;
          else this.housesInBank += prop.houses;
        }
        delete this.properties[si];
      }
    }

    player.properties = [];
    player.money = 0;
    player.jailFreeCards = 0;
    this.pendingBankruptcy = null;

    this.log.push({ type: 'bankrupt', player: player.index });

    // Check game over
    const activePlayers = this.players.filter(p => !p.bankrupt);
    if (activePlayers.length <= 1) {
      this.gameOver = true;
      this.winner = activePlayers.length > 0 ? activePlayers[0].index : null;
      this.turnPhase = 'end';
    } else {
      this.turnPhase = 'end';
    }

    return true;
  }

  // --- Turn Management ---

  endTurn() {
    if (this.turnPhase !== 'end') return false;

    const isDoubles = this.dice[0] === this.dice[1] && this.diceRolled;
    const player = this.players[this.currentPlayer];

    if (isDoubles && !player.inJail && !player.bankrupt && this.doublesCount < 3) {
      // Same player rolls again
      this.diceRolled = false;
      this.turnPhase = 'roll';
      return true;
    }

    // Next player
    this.doublesCount = 0;
    this.diceRolled = false;
    let next = (this.currentPlayer + 1) % this.playerCount;
    while (this.players[next].bankrupt) {
      next = (next + 1) % this.playerCount;
    }
    this.currentPlayer = next;
    this.turnPhase = 'roll';
    return true;
  }

  // --- Utilities ---

  getStatus() {
    if (this.gameOver) return 'gameOver';
    return 'playing';
  }

  getPlayerNetWorth(playerIndex) {
    const player = this.players[playerIndex];
    let worth = player.money;

    for (const si of player.properties) {
      const space = SPACES[si];
      const prop = this.properties[si];
      if (!prop) continue;

      if (prop.mortgaged) {
        worth += space.mortgage;
      } else {
        worth += space.price;
      }

      if (prop.houses > 0 && space.houseCost) {
        const houses = prop.houses === 5 ? 5 : prop.houses;
        worth += houses * Math.floor(space.houseCost / 2);
      }
    }

    return worth;
  }

  getPlayersRanking() {
    return [...this.players]
      .map(p => ({ ...p, netWorth: this.getPlayerNetWorth(p.index) }))
      .sort((a, b) => {
        if (a.bankrupt && !b.bankrupt) return 1;
        if (!a.bankrupt && b.bankrupt) return -1;
        return b.netWorth - a.netWorth;
      });
  }

  isDoubles() {
    return this.diceRolled && this.dice[0] === this.dice[1];
  }
}

module.exports = { MonopolyEngine };
