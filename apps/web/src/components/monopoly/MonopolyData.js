// Monopoly — French classic board (40 spaces)

export const STARTING_MONEY = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const MAX_JAIL_TURNS = 3;
export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;

export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
export const PLAYER_TOKENS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
export const PLAYER_TOKEN_IMAGES = [
  '/assets/monopoly/token_hat.png',
  '/assets/monopoly/token_car.png',
  '/assets/monopoly/token_dog.png',
  '/assets/monopoly/token_ship.png',
  '/assets/monopoly/token_boot.png',
  '/assets/monopoly/token_iron.png',
];

export const COLOR_GROUPS = {
  brown:  { color: '#8B4513', spaces: [1, 3] },
  cyan:   { color: '#00CED1', spaces: [6, 8, 9] },
  pink:   { color: '#FF69B4', spaces: [11, 13, 14] },
  orange: { color: '#FF8C00', spaces: [16, 18, 19] },
  red:    { color: '#FF0000', spaces: [21, 23, 24] },
  yellow: { color: '#FFD700', spaces: [26, 27, 29] },
  green:  { color: '#008000', spaces: [31, 32, 34] },
  blue:   { color: '#0000CD', spaces: [37, 39] },
};

// type: go, property, railroad, utility, tax, chance, community, jail-visit, free-parking, go-to-jail
export const SPACES = [
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

export const RAILROAD_INDICES = [5, 15, 25, 35];
export const UTILITY_INDICES = [12, 28];

// Chance cards (16)
export const CHANCE_CARDS = [
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

// Community Chest cards (16)
export const COMMUNITY_CARDS = [
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
