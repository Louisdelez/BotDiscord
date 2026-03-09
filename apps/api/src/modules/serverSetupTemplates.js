// ============= PREDEFINED TEMPLATES =============

const TEMPLATES = [
  {
    id: 'gaming',
    name: 'Gaming',
    icon: 'Gamepad2',
    description: 'Serveur de jeux complet avec channels gaming, streaming et tournois',
    tags: ['gaming', 'esport', 'streaming'],
    roles: [
      { key: 'admin', name: 'Admin', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
      { key: 'moderator', name: 'Modérateur', color: '#3498DB', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog'] },
      { key: 'vip', name: 'VIP', color: '#F1C40F', hoist: true, permissions: [] },
      { key: 'streamer', name: 'Streamer', color: '#9B59B6', hoist: true, permissions: [] },
      { key: 'member', name: 'Membre', color: '#2ECC71', hoist: false, permissions: [] },
    ],
    categories: [
      {
        name: 'Information',
        channels: [
          { name: 'règles', type: 'text', readOnly: true },
          { name: 'annonces', type: 'announcement', readOnly: true },
          { name: 'bienvenue', type: 'text', readOnly: true, configKey: 'welcomeChannelId' },
        ],
      },
      {
        name: 'Général',
        channels: [
          { name: 'general', type: 'text' },
          { name: 'off-topic', type: 'text' },
          { name: 'memes', type: 'text' },
          { name: 'introductions', type: 'text' },
          { name: 'Vocal Général', type: 'voice' },
        ],
      },
      {
        name: 'Gaming',
        channels: [
          { name: 'lfg', type: 'text' },
          { name: 'clips', type: 'text' },
          { name: 'Jeu 1', type: 'voice' },
          { name: 'Jeu 2', type: 'voice' },
          { name: 'tournois', type: 'text' },
        ],
      },
      {
        name: 'Tournois',
        channels: [
          { name: 'inscriptions', type: 'text' },
          { name: 'résultats', type: 'text' },
          { name: 'Salle de Match', type: 'voice' },
        ],
      },
      {
        name: 'Streaming',
        channels: [
          { name: 'live-annonces', type: 'text', restrictedTo: ['streamer'] },
          { name: 'promo', type: 'text' },
        ],
      },
      {
        name: 'Modération',
        channels: [
          { name: 'logs', type: 'text', private: true, configKey: 'logChannelId' },
          { name: 'mod-logs', type: 'text', private: true, configKey: 'modLogChannelId' },
          { name: 'mod-team', type: 'text', private: true },
          { name: 'Mod Vocal', type: 'voice', private: true },
        ],
      },
    ],
  },
  {
    id: 'community',
    name: 'Communauté',
    icon: 'Users',
    description: 'Serveur communautaire avec suggestions, sondages et événements',
    tags: ['communauté', 'social', 'discussion'],
    roles: [
      { key: 'admin', name: 'Admin', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
      { key: 'moderator', name: 'Modérateur', color: '#3498DB', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog'] },
      { key: 'helper', name: 'Helper', color: '#1ABC9C', hoist: true, permissions: ['ManageMessages'] },
      { key: 'verified', name: 'Vérifié', color: '#2ECC71', hoist: false, permissions: [] },
      { key: 'member', name: 'Membre', color: '#95A5A6', hoist: false, permissions: [] },
      { key: 'new', name: 'Nouveau', color: '#BDC3C7', hoist: false, permissions: [] },
    ],
    categories: [
      {
        name: 'Accueil',
        channels: [
          { name: 'règles', type: 'text', readOnly: true },
          { name: 'annonces', type: 'announcement', readOnly: true },
          { name: 'bienvenue', type: 'text', readOnly: true, configKey: 'welcomeChannelId' },
          { name: 'rôles', type: 'text', readOnly: true },
        ],
      },
      {
        name: 'Général',
        channels: [
          { name: 'general', type: 'text' },
          { name: 'off-topic', type: 'text' },
          { name: 'médias', type: 'text' },
          { name: 'Vocal Général', type: 'voice' },
        ],
      },
      {
        name: 'Communauté',
        channels: [
          { name: 'suggestions', type: 'text', configKey: 'suggestionsChannelId' },
          { name: 'sondages', type: 'text' },
          { name: 'événements', type: 'text' },
          { name: 'citations', type: 'text', configKey: 'quotesChannelId' },
          { name: 'confessions', type: 'text', configKey: 'confessionChannelId' },
        ],
      },
      {
        name: 'Modération',
        channels: [
          { name: 'logs', type: 'text', private: true, configKey: 'logChannelId' },
          { name: 'mod-logs', type: 'text', private: true, configKey: 'modLogChannelId' },
          { name: 'mod-team', type: 'text', private: true },
          { name: 'Mod Vocal', type: 'voice', private: true },
        ],
      },
    ],
  },
  {
    id: 'education',
    name: 'Éducation',
    icon: 'GraduationCap',
    description: 'Serveur éducatif avec salles de cours, groupes d\'étude et équipe pédagogique',
    tags: ['éducation', 'cours', 'école'],
    roles: [
      { key: 'admin', name: 'Admin', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
      { key: 'professor', name: 'Professeur', color: '#8E44AD', hoist: true, permissions: ['ManageMessages', 'ManageChannels'] },
      { key: 'tutor', name: 'Tuteur', color: '#3498DB', hoist: true, permissions: ['ManageMessages'] },
      { key: 'student', name: 'Étudiant', color: '#2ECC71', hoist: false, permissions: [] },
      { key: 'alumni', name: 'Ancien', color: '#F39C12', hoist: false, permissions: [] },
    ],
    categories: [
      {
        name: 'Information',
        channels: [
          { name: 'règles', type: 'text', readOnly: true },
          { name: 'annonces', type: 'announcement', readOnly: true },
          { name: 'bienvenue', type: 'text', readOnly: true, configKey: 'welcomeChannelId' },
          { name: 'ressources', type: 'text', readOnly: true },
        ],
      },
      {
        name: 'Cours',
        channels: [
          { name: 'maths', type: 'text' },
          { name: 'sciences', type: 'text' },
          { name: 'langues', type: 'text' },
          { name: 'informatique', type: 'text' },
          { name: 'histoire', type: 'text' },
        ],
      },
      {
        name: 'Travail en Groupe',
        channels: [
          { name: 'Salle de Classe', type: 'voice' },
          { name: 'Groupe Étude 1', type: 'voice' },
          { name: 'Groupe Étude 2', type: 'voice' },
          { name: 'Groupe Étude 3', type: 'voice' },
        ],
      },
      {
        name: 'Communauté',
        channels: [
          { name: 'general', type: 'text' },
          { name: 'off-topic', type: 'text' },
          { name: 'entraide', type: 'text' },
          { name: 'Vocal Détente', type: 'voice' },
        ],
      },
      {
        name: 'Équipe Pédagogique',
        channels: [
          { name: 'salle-profs', type: 'text', private: true },
          { name: 'notes', type: 'text', private: true },
          { name: 'Réunion Profs', type: 'voice', private: true },
        ],
      },
    ],
  },
  {
    id: 'startup',
    name: 'Startup',
    icon: 'Rocket',
    description: 'Serveur professionnel pour startup avec équipes, sprints et gestion de projet',
    tags: ['startup', 'business', 'projet'],
    roles: [
      { key: 'ceo', name: 'CEO', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
      { key: 'manager', name: 'Manager', color: '#E67E22', hoist: true, permissions: ['ManageMessages', 'ManageChannels', 'ViewAuditLog'] },
      { key: 'dev', name: 'Dev', color: '#3498DB', hoist: true, permissions: [] },
      { key: 'design', name: 'Design', color: '#9B59B6', hoist: true, permissions: [] },
      { key: 'marketing', name: 'Marketing', color: '#2ECC71', hoist: true, permissions: [] },
      { key: 'intern', name: 'Stagiaire', color: '#95A5A6', hoist: false, permissions: [] },
    ],
    categories: [
      {
        name: 'Général',
        channels: [
          { name: 'annonces', type: 'announcement', readOnly: true },
          { name: 'general', type: 'text' },
          { name: 'random', type: 'text' },
          { name: 'Vocal Général', type: 'voice' },
        ],
      },
      {
        name: 'Management',
        channels: [
          { name: 'stratégie', type: 'text', restrictedTo: ['ceo', 'manager'] },
          { name: 'rh', type: 'text', restrictedTo: ['ceo', 'manager'] },
          { name: 'Réunion Direction', type: 'voice', restrictedTo: ['ceo', 'manager'] },
        ],
      },
      {
        name: 'Développement',
        channels: [
          { name: 'dev-general', type: 'text', restrictedTo: ['dev'] },
          { name: 'code-review', type: 'text', restrictedTo: ['dev'] },
          { name: 'bugs', type: 'text', restrictedTo: ['dev'] },
          { name: 'Vocal Dev', type: 'voice', restrictedTo: ['dev'] },
        ],
      },
      {
        name: 'Design',
        channels: [
          { name: 'design-general', type: 'text', restrictedTo: ['design'] },
          { name: 'feedback-design', type: 'text', restrictedTo: ['design'] },
          { name: 'Vocal Design', type: 'voice', restrictedTo: ['design'] },
        ],
      },
      {
        name: 'Marketing',
        channels: [
          { name: 'campagnes', type: 'text', restrictedTo: ['marketing'] },
          { name: 'analytics', type: 'text', restrictedTo: ['marketing'] },
          { name: 'Vocal Marketing', type: 'voice', restrictedTo: ['marketing'] },
        ],
      },
      {
        name: 'Projet',
        channels: [
          { name: 'roadmap', type: 'text' },
          { name: 'sprint', type: 'text' },
          { name: 'standup', type: 'text' },
          { name: 'Daily Standup', type: 'voice' },
        ],
      },
    ],
  },
  {
    id: 'creative',
    name: 'Créatif',
    icon: 'Palette',
    description: 'Serveur créatif avec vitrines, espaces de création et feedback communautaire',
    tags: ['art', 'musique', 'créatif'],
    roles: [
      { key: 'admin', name: 'Admin', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
      { key: 'moderator', name: 'Modérateur', color: '#3498DB', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog'] },
      { key: 'artist', name: 'Artiste', color: '#E91E63', hoist: true, permissions: [] },
      { key: 'musician', name: 'Musicien', color: '#9C27B0', hoist: true, permissions: [] },
      { key: 'member', name: 'Membre', color: '#2ECC71', hoist: false, permissions: [] },
    ],
    categories: [
      {
        name: 'Vitrine',
        channels: [
          { name: 'portfolios', type: 'text', readOnly: true },
          { name: 'commissions', type: 'text', readOnly: true },
          { name: 'annonces', type: 'announcement', readOnly: true },
        ],
      },
      {
        name: 'Création',
        channels: [
          { name: 'dessin', type: 'text' },
          { name: 'musique', type: 'text' },
          { name: 'photo-vidéo', type: 'text' },
          { name: 'feedback', type: 'text' },
          { name: 'Vocal Création', type: 'voice' },
        ],
      },
      {
        name: 'Communauté',
        channels: [
          { name: 'general', type: 'text' },
          { name: 'off-topic', type: 'text' },
          { name: 'inspiration', type: 'text' },
          { name: 'Vocal Détente', type: 'voice' },
        ],
      },
      {
        name: 'Staff',
        channels: [
          { name: 'staff-general', type: 'text', private: true },
          { name: 'logs', type: 'text', private: true, configKey: 'logChannelId' },
          { name: 'Vocal Staff', type: 'voice', private: true },
        ],
      },
    ],
  },
];

// ============= PRESETS =============

const PRESETS = {
  roles: [
    {
      id: 'moderation',
      name: 'Modération',
      icon: 'Shield',
      items: [
        { name: 'Admin', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
        { name: 'Modérateur', color: '#3498DB', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog'] },
        { name: 'Helper', color: '#1ABC9C', hoist: true, permissions: ['ManageMessages'] },
      ],
    },
    {
      id: 'creators',
      name: 'Créateurs',
      icon: 'Brush',
      items: [
        { name: 'Streamer', color: '#9B59B6', hoist: true, permissions: [] },
        { name: 'Artiste', color: '#E91E63', hoist: true, permissions: [] },
        { name: 'Développeur', color: '#3498DB', hoist: true, permissions: [] },
      ],
    },
    {
      id: 'progression',
      name: 'Progression',
      icon: 'Star',
      items: [
        { name: 'Légende', color: '#F1C40F', hoist: true, permissions: [] },
        { name: 'Vétéran', color: '#E67E22', hoist: true, permissions: [] },
        { name: 'Membre', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Nouveau', color: '#BDC3C7', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'age',
      name: 'Âge',
      icon: 'Cake',
      items: [
        { name: '-14', color: '#85C1E9', hoist: false, permissions: [] },
        { name: '14-16', color: '#3498DB', hoist: false, permissions: [] },
        { name: '16-18', color: '#2ECC71', hoist: false, permissions: [] },
        { name: '18-21', color: '#F39C12', hoist: false, permissions: [] },
        { name: '21-25', color: '#E67E22', hoist: false, permissions: [] },
        { name: '25-30', color: '#E74C3C', hoist: false, permissions: [] },
        { name: '30+', color: '#8E44AD', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'gender',
      name: 'Genre',
      icon: 'User',
      items: [
        { name: 'Homme', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'Femme', color: '#E91E63', hoist: false, permissions: [] },
        { name: 'Non-binaire', color: '#9B59B6', hoist: false, permissions: [] },
        { name: 'Transgenre', color: '#1ABC9C', hoist: false, permissions: [] },
        { name: 'Agenre', color: '#95A5A6', hoist: false, permissions: [] },
        { name: 'Genderfluid', color: '#F39C12', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'orientation',
      name: 'Orientation sexuelle',
      icon: 'Rainbow',
      items: [
        { name: 'Hétéro', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'Gay', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Lesbienne', color: '#E91E63', hoist: false, permissions: [] },
        { name: 'Bisexuel(le)', color: '#9B59B6', hoist: false, permissions: [] },
        { name: 'Pansexuel(le)', color: '#F1C40F', hoist: false, permissions: [] },
        { name: 'Asexuel(le)', color: '#95A5A6', hoist: false, permissions: [] },
        { name: 'Queer', color: '#1ABC9C', hoist: false, permissions: [] },
        { name: 'En questionnement', color: '#E67E22', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'romantic',
      name: 'Orientation romantique',
      icon: 'HeartHandshake',
      items: [
        { name: 'Hétéroromantique', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'Homoromantique', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Biromantique', color: '#9B59B6', hoist: false, permissions: [] },
        { name: 'Panromantique', color: '#F1C40F', hoist: false, permissions: [] },
        { name: 'Aromantique', color: '#95A5A6', hoist: false, permissions: [] },
        { name: 'Demiromantique', color: '#E67E22', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'relationship',
      name: 'Statut amoureux',
      icon: 'Heart',
      items: [
        { name: 'Célibataire', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'En couple', color: '#E91E63', hoist: false, permissions: [] },
        { name: 'Marié(e)', color: '#E74C3C', hoist: false, permissions: [] },
        { name: "C'est compliqué", color: '#F39C12', hoist: false, permissions: [] },
        { name: 'Libre', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Non précisé', color: '#95A5A6', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'country',
      name: 'Pays',
      icon: 'Globe',
      items: [
        { name: '🇫🇷 France', color: '#3498DB', hoist: false, permissions: [] },
        { name: '🇧🇪 Belgique', color: '#F1C40F', hoist: false, permissions: [] },
        { name: '🇨🇭 Suisse', color: '#E74C3C', hoist: false, permissions: [] },
        { name: '🇨🇦 Canada', color: '#E74C3C', hoist: false, permissions: [] },
        { name: '🇲🇦 Maroc', color: '#2ECC71', hoist: false, permissions: [] },
        { name: '🇩🇿 Algérie', color: '#2ECC71', hoist: false, permissions: [] },
        { name: '🇹🇳 Tunisie', color: '#E74C3C', hoist: false, permissions: [] },
        { name: '🇨🇮 Côte d\'Ivoire', color: '#E67E22', hoist: false, permissions: [] },
        { name: '🇸🇳 Sénégal', color: '#2ECC71', hoist: false, permissions: [] },
        { name: '🇩🇪 Allemagne', color: '#2C3E50', hoist: false, permissions: [] },
        { name: '🇪🇸 Espagne', color: '#E74C3C', hoist: false, permissions: [] },
        { name: '🇬🇧 Royaume-Uni', color: '#3498DB', hoist: false, permissions: [] },
        { name: '🇺🇸 États-Unis', color: '#3498DB', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'platform',
      name: 'Plateforme',
      icon: 'Monitor',
      items: [
        { name: 'PC', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'PlayStation', color: '#2C3E50', hoist: false, permissions: [] },
        { name: 'Xbox', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Nintendo Switch', color: '#E74C3C', hoist: false, permissions: [] },
        { name: 'Mobile', color: '#F39C12', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'games',
      name: 'Jeux',
      icon: 'Gamepad2',
      items: [
        { name: 'Minecraft', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Valorant', color: '#E74C3C', hoist: false, permissions: [] },
        { name: 'LoL', color: '#F1C40F', hoist: false, permissions: [] },
        { name: 'Fortnite', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'GTA', color: '#E67E22', hoist: false, permissions: [] },
        { name: 'CS2', color: '#95A5A6', hoist: false, permissions: [] },
        { name: 'Rocket League', color: '#1ABC9C', hoist: false, permissions: [] },
        { name: 'Apex Legends', color: '#E74C3C', hoist: false, permissions: [] },
        { name: 'Overwatch', color: '#F39C12', hoist: false, permissions: [] },
        { name: 'R6 Siege', color: '#2C3E50', hoist: false, permissions: [] },
        { name: 'Genshin Impact', color: '#9B59B6', hoist: false, permissions: [] },
        { name: 'FIFA / FC', color: '#27AE60', hoist: false, permissions: [] },
        { name: 'Call of Duty', color: '#2C3E50', hoist: false, permissions: [] },
        { name: 'Roblox', color: '#E74C3C', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'languages',
      name: 'Langues',
      icon: 'Languages',
      items: [
        { name: 'Français', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'English', color: '#E74C3C', hoist: false, permissions: [] },
        { name: 'Español', color: '#F39C12', hoist: false, permissions: [] },
        { name: 'Deutsch', color: '#2C3E50', hoist: false, permissions: [] },
        { name: 'العربية', color: '#27AE60', hoist: false, permissions: [] },
        { name: 'Português', color: '#2ECC71', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'horoscope',
      name: 'Horoscope',
      icon: 'Sparkles',
      items: [
        { name: '♈ Bélier', color: '#E74C3C', hoist: false, permissions: [] },
        { name: '♉ Taureau', color: '#2ECC71', hoist: false, permissions: [] },
        { name: '♊ Gémeaux', color: '#F1C40F', hoist: false, permissions: [] },
        { name: '♋ Cancer', color: '#85C1E9', hoist: false, permissions: [] },
        { name: '♌ Lion', color: '#E67E22', hoist: false, permissions: [] },
        { name: '♍ Vierge', color: '#27AE60', hoist: false, permissions: [] },
        { name: '♎ Balance', color: '#E91E63', hoist: false, permissions: [] },
        { name: '♏ Scorpion', color: '#8E44AD', hoist: false, permissions: [] },
        { name: '♐ Sagittaire', color: '#9B59B6', hoist: false, permissions: [] },
        { name: '♑ Capricorne', color: '#2C3E50', hoist: false, permissions: [] },
        { name: '♒ Verseau', color: '#3498DB', hoist: false, permissions: [] },
        { name: '♓ Poissons', color: '#1ABC9C', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'colors',
      name: 'Couleurs',
      icon: 'Paintbrush',
      items: [
        { name: 'Rouge', color: '#E74C3C', hoist: false, permissions: [] },
        { name: 'Bleu', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'Vert', color: '#2ECC71', hoist: false, permissions: [] },
        { name: 'Violet', color: '#9B59B6', hoist: false, permissions: [] },
        { name: 'Rose', color: '#E91E63', hoist: false, permissions: [] },
        { name: 'Orange', color: '#E67E22', hoist: false, permissions: [] },
        { name: 'Jaune', color: '#F1C40F', hoist: false, permissions: [] },
        { name: 'Noir', color: '#2C3E50', hoist: false, permissions: [] },
        { name: 'Blanc', color: '#ECF0F1', hoist: false, permissions: [] },
        { name: 'Turquoise', color: '#1ABC9C', hoist: false, permissions: [] },
      ],
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: 'BellRing',
      items: [
        { name: 'Annonces', color: '#3498DB', hoist: false, permissions: [] },
        { name: 'Événements', color: '#E67E22', hoist: false, permissions: [] },
        { name: 'Giveaways', color: '#F1C40F', hoist: false, permissions: [] },
        { name: 'Mises à jour', color: '#2ECC71', hoist: false, permissions: [] },
      ],
    },
  ],
  channels: [
    {
      id: 'community-channels',
      name: 'Communautaires',
      icon: 'MessageCircle',
      items: [
        { name: 'general', type: 'text' },
        { name: 'introductions', type: 'text' },
        { name: 'médias', type: 'text' },
        { name: 'humour', type: 'text' },
      ],
    },
    {
      id: 'voice-standard',
      name: 'Vocaux standard',
      icon: 'Volume2',
      items: [
        { name: 'Général', type: 'voice' },
        { name: 'AFK', type: 'voice' },
        { name: 'Musique', type: 'voice' },
      ],
    },
    {
      id: 'info-channels',
      name: 'Information',
      icon: 'ClipboardList',
      items: [
        { name: 'règles', type: 'text', readOnly: true },
        { name: 'annonces', type: 'announcement', readOnly: true },
        { name: 'bienvenue', type: 'text', readOnly: true, configKey: 'welcomeChannelId' },
      ],
    },
    {
      id: 'moderation-channels',
      name: 'Modération',
      icon: 'Lock',
      items: [
        { name: 'logs', type: 'text', private: true, configKey: 'logChannelId' },
        { name: 'mod-logs', type: 'text', private: true, configKey: 'modLogChannelId' },
        { name: 'mod-team', type: 'text', private: true },
        { name: 'Mod Vocal', type: 'voice', private: true },
      ],
    },
  ],
};

function getTemplates() {
  return TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    description: t.description,
    tags: t.tags,
    roleCount: t.roles.length,
    channelCount: t.categories.reduce((sum, c) => sum + c.channels.length, 0),
  }));
}

function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}

function getPresets() {
  return PRESETS;
}

module.exports = { getTemplates, getTemplateById, getPresets, TEMPLATES, PRESETS };
