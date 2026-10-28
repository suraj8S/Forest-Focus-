// Tree Species Definitions and Dynamic SVG Renderer
// Provides authentic Forest-style illustrations for all growth stages and withered state

const TREE_SPECIES = [
  {
    id: 'classic_pine',
    name: 'Cedar Pine',
    emoji: '🌲',
    price: 0,
    unlocked: true,
    description: 'Resilient evergreen that thrives through the harshest alpine storms.',
    accentColor: '#52B788',
    soilColor: '#4A3B32'
  },
  {
    id: 'sakura',
    name: 'Cherry Blossom',
    emoji: '🌸',
    price: 100,
    unlocked: false,
    description: 'Ephemeral pink blossoms whispering gentle moments of tranquil focus.',
    accentColor: '#F72585',
    soilColor: '#4A3B32'
  },
  {
    id: 'bonsai',
    name: 'Zen Bonsai',
    emoji: '🪴',
    price: 200,
    unlocked: false,
    description: 'Art of patience and discipline sculpted over decades in quiet contemplation.',
    accentColor: '#70E000',
    soilColor: '#382A21'
  },
  {
    id: 'celestial',
    name: 'Celestial Willow',
    emoji: '✨',
    price: 350,
    unlocked: false,
    description: 'Luminescent branches charged with stardust that glow under deep concentration.',
    accentColor: '#4CC9F0',
    soilColor: '#241442'
  },
  {
    id: 'willow',
    name: 'Weeping Willow',
    emoji: '🌿',
    price: 500,
    unlocked: false,
    description: 'Graceful emerald cascades swaying gently to clear your mindful thoughts.',
    accentColor: '#38B000',
    soilColor: '#3E3228'
  },
  {
    id: 'cactus',
    name: 'Desert Saguaro',
    emoji: '🌵',
    price: 650,
    unlocked: false,
    description: 'A sovereign desert titan with blooming flowers that stores relentless willpower.',
    accentColor: '#06D6A0',
    soilColor: '#B08968'
  },
  {
    id: 'ginkgo',
    name: 'Golden Ginkgo',
    emoji: '🍂',
    price: 800,
    unlocked: false,
    description: 'Living ancient relic with luminous golden fan leaves showering warm wisdom.',
    accentColor: '#FFB703',
    soilColor: '#4A3828'
  },
  {
    id: 'baobab',
    name: 'Ancient Baobab',
    emoji: '🌳',
    price: 1000,
    unlocked: false,
    description: 'The sacred tree of life with a colossal trunk holding centuries of endurance.',
    accentColor: '#9D4EDD',
    soilColor: '#503522'
  }
];

class TreeRenderer {
  static getSpecies(id) {
    return TREE_SPECIES.find(s => s.id === id) || TREE_SPECIES[0];
  }

  static render(speciesId, stage = 3, isWithered = false, size = 180) {
    const sp = this.getSpecies(speciesId);

    // If withered, render dead leafless dry trunk
    if (isWithered) {
      return `
        <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg withered-tree">
          <ellipse cx="100" cy="180" rx="45" ry="12" fill="#2b2b2b" opacity="0.6"/>
          <!-- Dry dead trunk with crooked branches -->
          <path d="M96,180 L98,130 L85,105 L80,95 M85,105 L90,92 M98,130 L106,100 L118,85 L125,70 M106,100 L102,80 M98,130 L97,75 L92,55 M97,75 L105,60" 
                stroke="#6c757d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <!-- Little dead twig at base -->
          <path d="M94,175 L85,168 M102,172 L112,165" stroke="#495057" stroke-width="3" stroke-linecap="round"/>
          <!-- Dead smoke or withered leaf -->
          <circle cx="80" cy="95" r="2" fill="#adb5bd" opacity="0.4"/>
          <circle cx="125" cy="70" r="2" fill="#adb5bd" opacity="0.4"/>
        </svg>
      `;
    }

    // Stage 0: Planted Seed
    if (stage === 0) {
      return `
        <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg stage-seed">
          <ellipse cx="100" cy="175" rx="50" ry="14" fill="${sp.soilColor}"/>
          <ellipse cx="100" cy="172" rx="35" ry="9" fill="#2D1E16"/>
          <!-- Seed nestled in soil with subtle glow -->
          <ellipse cx="100" cy="168" rx="8" ry="11" fill="#8D6E63" transform="rotate(-15, 100, 168)"/>
          <path d="M100,160 Q101,154 103,150" stroke="#74C69D" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <circle cx="103" cy="149" r="2" fill="#95D5B2"/>
        </svg>
      `;
    }

    // Stage 1: Small Green Sprout
    if (stage === 1) {
      return `
        <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg stage-sprout">
          <ellipse cx="100" cy="175" rx="45" ry="12" fill="${sp.soilColor}"/>
          <!-- Sprout Stem -->
          <path d="M100,172 Q98,145 100,125" stroke="#52B788" stroke-width="5" stroke-linecap="round" fill="none"/>
          <!-- Left Leaf -->
          <path d="M99,140 Q80,132 82,122 Q95,128 99,135" fill="${sp.accentColor}"/>
          <!-- Right Leaf -->
          <path d="M100,132 Q118,124 116,114 Q104,120 100,128" fill="#74C69D"/>
          <!-- Tiny Dew Drop -->
          <circle cx="83" cy="123" r="2" fill="#E8F5E9" opacity="0.8"/>
        </svg>
      `;
    }

    // Stage 2: Young Sapling
    if (stage === 2) {
      return `
        <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg stage-sapling">
          <ellipse cx="100" cy="175" rx="48" ry="13" fill="${sp.soilColor}"/>
          <!-- Sapling Trunk -->
          <path d="M97,174 L99,120 L96,80 M99,135 L88,115 M99,120 L110,105" 
                stroke="#6D4C41" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <!-- Foliage clusters -->
          <ellipse cx="96" cy="75" rx="22" ry="20" fill="${sp.accentColor}"/>
          <ellipse cx="85" cy="112" rx="14" ry="12" fill="#52B788"/>
          <ellipse cx="112" cy="103" rx="15" ry="13" fill="#74C69D"/>
        </svg>
      `;
    }

    // Stage 3: Mature Tree (Custom per species)
    return this.renderMatureSpecies(sp, size);
  }

  static renderMatureSpecies(sp, size) {
    switch (sp.id) {
      case 'sakura':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-sakura">
            <ellipse cx="100" cy="178" rx="55" ry="12" fill="${sp.soilColor}" opacity="0.8"/>
            <!-- Twisted graceful trunk -->
            <path d="M95,178 Q93,140 100,110 Q90,90 78,80 M100,110 Q112,85 125,75 M100,110 L100,70" 
                  stroke="#5C4033" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Cherry blossom foliage clouds -->
            <ellipse cx="100" cy="65" rx="38" ry="32" fill="#FFAFCC"/>
            <ellipse cx="72" cy="80" rx="30" ry="26" fill="#FFC8DD"/>
            <ellipse cx="128" cy="76" rx="32" ry="28" fill="#FFB3C6"/>
            <ellipse cx="102" cy="48" rx="26" ry="22" fill="#FF85A1"/>
            <!-- Falling blossom petals -->
            <circle cx="68" cy="130" r="3.5" fill="#FF758F" class="falling-petal p1"/>
            <circle cx="132" cy="120" r="3" fill="#FF758F" class="falling-petal p2"/>
            <circle cx="110" cy="145" r="2.5" fill="#FFAFCC" class="falling-petal p3"/>
          </svg>
        `;

      case 'bonsai':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-bonsai">
            <ellipse cx="100" cy="178" rx="55" ry="12" fill="#2E241E" opacity="0.6"/>
            <!-- Zen Ceramic Pot -->
            <path d="M65,160 L135,160 L128,175 L72,175 Z" fill="#264653" stroke="#1D3557" stroke-width="2"/>
            <rect x="74" y="175" width="8" height="4" fill="#1D3557"/>
            <rect x="118" y="175" width="8" height="4" fill="#1D3557"/>
            <!-- Gnarled Bonsai Trunk -->
            <path d="M96,160 Q82,130 110,115 Q130,105 120,85 Q115,75 105,72 M95,123 Q78,110 70,95 M116,98 Q138,90 142,80" 
                  stroke="#4E342E" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Manicured Zen Foliage Pads -->
            <ellipse cx="100" cy="65" rx="28" ry="14" fill="#2D6A4F"/>
            <ellipse cx="68" cy="92" rx="22" ry="11" fill="#40916C"/>
            <ellipse cx="140" cy="78" rx="20" ry="10" fill="#52B788"/>
          </svg>
        `;

      case 'celestial':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-celestial">
            <ellipse cx="100" cy="178" rx="55" ry="12" fill="#1A102F" opacity="0.8"/>
            <!-- Starlight Aura -->
            <circle cx="100" cy="85" r="65" fill="#4CC9F0" opacity="0.12" class="celestial-glow"/>
            <!-- Silver Crystal Trunk -->
            <path d="M96,178 L98,125 L88,95 L80,75 M98,125 L112,95 L124,72 M98,125 L100,80" 
                  stroke="#E0AAFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Glowing Cosmic Star Canopy -->
            <ellipse cx="100" cy="75" rx="42" ry="38" fill="#7209B7" opacity="0.85"/>
            <ellipse cx="80" cy="85" rx="30" ry="26" fill="#3A0CA3" opacity="0.8"/>
            <ellipse cx="120" cy="80" rx="32" ry="28" fill="#4361EE" opacity="0.85"/>
            <ellipse cx="100" cy="60" rx="28" ry="24" fill="#4CC9F0" opacity="0.75"/>
            <!-- Shining Stars -->
            <polygon points="100,45 102,51 108,52 103,56 105,62 100,58 95,62 97,56 92,52 98,51" fill="#FFF" class="star s1"/>
            <polygon points="75,70 76,74 80,75 77,78 78,82 75,79 72,82 73,78 70,75 74,74" fill="#FFD166" class="star s2"/>
            <polygon points="125,65 126,69 130,70 127,73 128,77 125,74 122,77 123,73 120,70 124,69" fill="#FFF" class="star s3"/>
          </svg>
        `;

      case 'willow':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-willow">
            <ellipse cx="100" cy="178" rx="55" ry="12" fill="${sp.soilColor}" opacity="0.8"/>
            <!-- Trunk -->
            <path d="M96,178 Q94,135 100,100 Q95,78 92,60 M100,100 Q108,80 115,62 M100,100 L100,68" 
                  stroke="#4A3B32" stroke-width="8" stroke-linecap="round" fill="none"/>
            <!-- Upper Canopy -->
            <ellipse cx="100" cy="62" rx="40" ry="28" fill="#2D6A4F"/>
            <!-- Cascading Weeping Vines -->
            <path d="M70,70 Q60,110 65,145" stroke="#52B788" stroke-width="3" stroke-linecap="round" fill="none"/>
            <path d="M82,75 Q75,115 80,150" stroke="#74C69D" stroke-width="3.5" stroke-linecap="round" fill="none"/>
            <path d="M96,78 Q93,120 95,155" stroke="#52B788" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M108,78 Q112,120 110,152" stroke="#40916C" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M120,75 Q128,115 125,148" stroke="#74C69D" stroke-width="3.5" stroke-linecap="round" fill="none"/>
            <path d="M132,70 Q142,110 138,142" stroke="#52B788" stroke-width="3" stroke-linecap="round" fill="none"/>
          </svg>
        `;

      case 'cactus':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-cactus">
            <ellipse cx="100" cy="178" rx="55" ry="12" fill="#D4A373" opacity="0.9"/>
            <!-- Desert Sand Mound -->
            <path d="M60,178 Q100,168 140,178 Z" fill="#E29578"/>
            <!-- Main Column Trunk -->
            <path d="M94,175 L94,65 Q94,52 100,52 Q106,52 106,65 L106,175 Z" fill="#2A9D8F"/>
            <!-- Rib stripes -->
            <line x1="100" y1="53" x2="100" y2="175" stroke="#264653" stroke-width="1.5" opacity="0.4"/>
            <!-- Left Arm -->
            <path d="M94,120 L75,120 Q65,120 65,110 L65,85 Q65,76 72,76 Q79,76 79,85 L79,108 L94,108 Z" fill="#2A9D8F"/>
            <!-- Right Arm -->
            <path d="M106,132 L125,132 Q135,132 135,122 L135,95 Q135,86 128,86 Q121,86 121,95 L121,120 L106,120 Z" fill="#2A9D8F"/>
            <!-- Blooming Desert Flowers -->
            <circle cx="100" cy="52" r="6" fill="#E76F51"/>
            <circle cx="100" cy="52" r="3" fill="#F4A261"/>
            <circle cx="72" cy="76" r="4.5" fill="#E76F51"/>
            <circle cx="128" cy="86" r="4.5" fill="#E76F51"/>
          </svg>
        `;

      case 'ginkgo':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-ginkgo">
            <ellipse cx="100" cy="178" rx="55" ry="12" fill="${sp.soilColor}" opacity="0.8"/>
            <!-- Trunk -->
            <path d="M96,178 L97,115 L86,85 M97,115 L108,82 M97,115 L98,72" 
                  stroke="#5C4033" stroke-width="8" stroke-linecap="round" fill="none"/>
            <!-- Golden Leaf Clusters -->
            <ellipse cx="100" cy="65" rx="38" ry="32" fill="#E9C46A"/>
            <ellipse cx="75" cy="82" rx="28" ry="24" fill="#F4A261"/>
            <ellipse cx="125" cy="80" rx="30" ry="26" fill="#E76F51"/>
            <ellipse cx="100" cy="46" rx="24" ry="20" fill="#FFB703"/>
            <!-- Fan leaves highlights -->
            <circle cx="70" cy="120" r="3" fill="#FFB703" class="falling-petal p1"/>
            <circle cx="125" cy="130" r="3" fill="#E9C46A" class="falling-petal p2"/>
          </svg>
        `;

      case 'baobab':
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-baobab">
            <ellipse cx="100" cy="178" rx="58" ry="14" fill="${sp.soilColor}" opacity="0.8"/>
            <!-- Giant Thick Trunk -->
            <path d="M78,178 Q82,120 86,95 Q88,85 75,70 M86,95 Q95,80 94,65 M86,95 Q105,82 114,95 Q118,85 125,72 M114,95 Q118,120 122,178 Z" 
                  fill="#6D4C41" stroke="#4E342E" stroke-width="3"/>
            <!-- Top Foliage Caps -->
            <ellipse cx="75" cy="65" rx="22" ry="14" fill="#2D6A4F"/>
            <ellipse cx="94" cy="58" rx="24" ry="15" fill="#40916C"/>
            <ellipse cx="125" cy="68" rx="22" ry="14" fill="#52B788"/>
          </svg>
        `;

      case 'classic_pine':
      default:
        return `
          <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="tree-svg mature-pine">
            <ellipse cx="100" cy="178" rx="52" ry="12" fill="${sp.soilColor}" opacity="0.8"/>
            <!-- Sturdy Pine Trunk -->
            <rect x="94" y="130" width="12" height="48" fill="#5D4037" rx="2"/>
            <!-- Tier 3 Foliage (Bottom) -->
            <polygon points="100,75 52,145 148,145" fill="#1B4332"/>
            <polygon points="100,75 100,145 148,145" fill="#2D6A4F"/>
            <!-- Tier 2 Foliage (Middle) -->
            <polygon points="100,50 62,108 138,108" fill="#2D6A4F"/>
            <polygon points="100,50 100,108 138,108" fill="#40916C"/>
            <!-- Tier 1 Foliage (Top) -->
            <polygon points="100,28 72,75 128,75" fill="#40916C"/>
            <polygon points="100,28 100,75 128,75" fill="#52B788"/>
            <!-- Star tip -->
            <circle cx="100" cy="27" r="2.5" fill="#95D5B2"/>
          </svg>
        `;
    }
  }
}

window.TREE_SPECIES = TREE_SPECIES;
window.TreeRenderer = TreeRenderer;
