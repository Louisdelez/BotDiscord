import {
  SPACES, CHANCE_CARDS, COMMUNITY_CARDS, RAILROAD_INDICES, UTILITY_INDICES,
  COLOR_GROUPS, STARTING_MONEY, GO_SALARY, JAIL_FINE, MAX_JAIL_TURNS,
  TOTAL_HOUSES, TOTAL_HOTELS,
} from './MonopolyData';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class MonopolyEngine {
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
    const minHouses = Math.min(...groupSpaces.map(si => (this.properties[si]?.houses || 0)));
    if (prop.houses > minHouses) return false;

    // Check if any property in group is mortgaged
    if (groupSpaces.some(si => this.properties[si]?.mortgaged)) return false;

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
    const maxHouses = Math.max(...groupSpaces.map(si => (this.properties[si]?.houses || 0)));
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
      if (groupSpaces.some(si => (this.properties[si]?.houses || 0) > 0)) return false;
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

    const creditor = this.pendingBankruptcy?.creditor;

    if (creditor !== null && creditor !== undefined) {
      // Transfer assets to creditor
      const cred = this.players[creditor];
      for (const si of player.properties) {
        this.properties[si].owner = creditor;
        cred.properties.push(si);
        // If mortgaged, creditor must pay 10% immediately or unmortgage
      }
      cred.money += Math.max(0, player.money + (this.pendingBankruptcy?.amount || 0));
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
      this.winner = activePlayers[0]?.index ?? null;
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
