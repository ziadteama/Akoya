import { useState, useEffect } from "react";
import { Box, Typography, Button, Grid, Card, CardContent, CardMedia, Chip, TextField, IconButton } from "@mui/material";
import { Search, RotateCcw, Coffee, Code, Camera, Gamepad2, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import all local images at the top
import blockchainImg from '../assets/blockchain.jpg';
import neuralnetworksImg from '../assets/neuralnetworks.jpg';
import morningmeditationImg from '../assets/morningmeditation.jpg';
import minimalismImg from '../assets/minimalism.jpg';
import coffeemeditationImg from '../assets/coffeemeditation.jpg';
import SpeedrunninglifeImg from '../assets/Speedrunninglife.jpg';
import eastereggImg from '../assets/easteregg.jpg';
import retrogamingImg from '../assets/retrogaming.jpg';
import uvphotographyImg from '../assets/uvphotography.jpg';
import StreetphotographyImg from '../assets/Streetphotography.jpg';
import AstrographyImg from '../assets/Astrography.jpg';
import aifermentationImg from '../assets/aifermentation.jpg';
import unamirevImg from '../assets/unamirev.jpg';

const blogThemes = {
  tech: {
    name: "TechFlow",
    tagline: "Innovation Unleashed",
    color: "#1976d2",
    icon: Code,
    articles: [
      {
        title: "The Rise of Quantum Computing in Web Development",
        image: blockchainImg,
        summary: "How quantum algorithms are revolutionizing frontend frameworks and changing the way we think about state management.",
        tag: "Quantum Tech",
        date: "2 hours ago"
      },
      {
        title: "Neural Networks That Write Their Own Code",
        image: neuralnetworksImg,
        summary: "AI systems are now capable of generating entire applications from simple prompts. The future is here.",
        tag: "AI Development",
        date: "5 hours ago"
      },
      {
        title: "Blockchain-Powered CSS: The Next Evolution",
        image: blockchainImg,
        summary: "Decentralized stylesheets are changing how we approach web design. Learn about this groundbreaking technology.",
        tag: "Web3",
        date: "1 day ago"
      }
    ]
  },
  lifestyle: {
    name: "ZenLife",
    tagline: "Living Mindfully",
    color: "#4caf50",
    icon: Heart,
    articles: [
      {
        title: "The Secret to Morning Productivity: Backwards Meditation",
        image: morningmeditationImg,
        summary: "Discover how meditating in reverse chronological order can unlock unprecedented focus and creativity.",
        tag: "Wellness",
        date: "3 hours ago"
      },
      {
        title: "Minimalism 2.0: The Art of Strategic Clutter",
        image: minimalismImg,
        summary: "Why having exactly 37 meaningful objects in your space creates the perfect balance for modern living.",
        tag: "Minimalism",
        date: "6 hours ago"
      },
      {
        title: "Coffee Cupping Meditation: A New Path to Enlightenment",
        image: coffeemeditationImg,
        summary: "Ancient brewing techniques combined with mindfulness practices for the ultimate coffee experience.",
        tag: "Mindfulness",
        date: "12 hours ago"
      }
    ]
  },
  gaming: {
    name: "PixelVerse",
    tagline: "Beyond Reality",
    color: "#ff5722",
    icon: Gamepad2,
    articles: [
      {
        title: "Speedrunning Life: Applying Gaming Strategies to Daily Tasks",
        image: SpeedrunninglifeImg,
        summary: "Learn how frame-perfect timing and route optimization can transform your productivity levels.",
        tag: "Life Hacks",
        date: "1 hour ago"
      },
      {
        title: "The Psychology of Easter Eggs in Modern Game Design",
        image: eastereggImg,
        summary: "Hidden secrets in games trigger the same reward pathways as discovering treasure in real life.",
        tag: "Game Design",
        date: "4 hours ago"
      },
      {
        title: "Retro Gaming's Influence on Contemporary Architecture",
        image: retrogamingImg,
        summary: "How 8-bit aesthetics are inspiring modern building design and urban planning initiatives.",
        tag: "Retro",
        date: "8 hours ago"
      }
    ]
  },
  photography: {
    name: "LensLife",
    tagline: "Capturing Moments",
    color: "#9c27b0",
    icon: Camera,
    articles: [
      {
        title: "Photographing Invisible Light: UV Photography Techniques",
        image: uvphotographyImg,
        summary: "Reveal hidden patterns in nature using specialized UV equipment and post-processing techniques.",
        tag: "Technical",
        date: "30 min ago"
      },
      {
        title: "The Golden Ratio in Street Photography",
        image: StreetphotographyImg,
        summary: "Mathematical principles that make urban photography more compelling and emotionally resonant.",
        tag: "Composition",
        date: "2 hours ago"
      },
      {
        title: "Time-Lapse Astrophotography: Capturing Cosmic Motion",
        image: AstrographyImg,
        summary: "Advanced techniques for documenting celestial movements over extended periods.",
        tag: "Astrophoto",
        date: "5 hours ago"
      }
    ]
  },
  food: {
    name: "FlavorLab",
    tagline: "Culinary Science",
    color: "#ff9800",
    icon: Coffee,
    articles: [
      {
        title: "Molecular Gastronomy in Home Kitchens: Edible Holograms",
        image: aifermentationImg,
        summary: "Create stunning visual effects with food using simple household chemistry and creative presentation.",
        tag: "Innovation",
        date: "1 hour ago"
      },
      {
        title: "The Umami Revolution: Discovering the 6th Taste",
        image: unamirevImg,
        summary: "Scientists have identified a new taste receptor that explains why some foods are irresistibly addictive.",
        tag: "Science",
        date: "3 hours ago"
      },
      {
        title: "Fermentation 3.0: AI-Optimized Flavor Development",
        image: aifermentationImg,
        summary: "Machine learning algorithms are creating unprecedented flavor combinations through controlled fermentation.",
        tag: "AI Food",
        date: "7 hours ago"
      }
    ]
  }
};

export default function SneakyBlogGenerator() {
  const [currentTheme, setCurrentTheme] = useState('tech');
  const [secretProgress, setSecretProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [easterEggFound, setEasterEggFound] = useState(false);
  const navigate = useNavigate();

  const theme = blogThemes[currentTheme];
  const IconComponent = theme.icon;

  // Only backdoor: Lucky Stars (click star 7 times)
  const handleStarClick = () => {
    const starClicks = (secretProgress.starClicks || 0) + 1;
    setSecretProgress({ ...secretProgress, starClicks });
    if (starClicks >= 7) {
      setEasterEggFound(true);
      setTimeout(() => navigate("/signin"), 1000);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", position: "relative" }}>
      {/* Subtle easter egg indicator */}
      {easterEggFound && (
        <Box sx={{ 
          position: "fixed", 
          top: 20, 
          right: 20, 
          zIndex: 1000,
          animation: "pulse 1s infinite"
        }}>
          <Star 
            size={24} 
            fill={theme.color} 
            color={theme.color}
            style={{ filter: "drop-shadow(0 0 10px " + theme.color + ")" }}
          />
        </Box>
      )}

      {/* Header */}
      <Box sx={{ 
        background: `linear-gradient(135deg, ${theme.color}15 0%, ${theme.color}05 100%)`,
        borderBottom: `3px solid ${theme.color}20`,
        py: 3,
        mb: 4 
      }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box 
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            >
              <IconComponent 
                size={40} 
                color={theme.color}
                style={{ marginRight: 12 }}
              />
              <Box>
                <Typography
                  variant="h3"
                  fontWeight="800"
                  sx={{ 
                    color: theme.color,
                    textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                    userSelect: "none"
                  }}
                >
                  {theme.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" fontWeight="500">
                  {theme.tagline}
                </Typography>
              </Box>
            </Box>

            {/* Theme Switcher */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {Object.entries(blogThemes).map(([key, t]) => {
                const ThemeIcon = t.icon;
                return (
                  <IconButton
                    key={key}
                    onClick={() => setCurrentTheme(key)}
                    sx={{ 
                      bgcolor: currentTheme === key ? t.color + "20" : "transparent",
                      "&:hover": { bgcolor: t.color + "30" }
                    }}
                  >
                    <ThemeIcon size={20} color={currentTheme === key ? t.color : "#666"} />
                  </IconButton>
                );
              })}
            </Box>
          </Box>

          {/* Search Bar (visual only) */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ 
                flexGrow: 1, 
                bgcolor: "white",
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: theme.color },
                  "&.Mui-focused fieldset": { borderColor: theme.color }
                }
              }}
              InputProps={{
                startAdornment: <Search size={18} color="#666" style={{ marginRight: 8 }} />
              }}
            />
            <Button
              variant="outlined"
              startIcon={<RotateCcw size={18} />}
              onClick={() => setCurrentTheme(Object.keys(blogThemes)[Math.floor(Math.random() * 5)])}
              sx={{ 
                borderColor: theme.color,
                color: theme.color,
                "&:hover": { 
                  borderColor: theme.color,
                  bgcolor: theme.color + "10"
                }
              }}
            >
              Random
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Articles Grid */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3 }}>
        <Grid container spacing={4}>
          {theme.articles.map((article, idx) => (
            <Grid item xs={12} md={6} lg={4} key={idx}>
              <Card 
                sx={{ 
                  height: "100%", 
                  display: "flex", 
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  "&:hover": { 
                    transform: "translateY(-8px)",
                    boxShadow: `0 20px 40px ${theme.color}20`
                  },
                  border: `2px solid transparent`,
                  "&:hover": {
                    borderColor: theme.color + "30"
                  }
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <CardMedia
                    component="img"
                    height="220"
                    image={article.image}
                    alt={article.title}
                    sx={{ objectFit: "cover" }}
                  />
                  <Chip
                    label={article.tag}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      bgcolor: theme.color,
                      color: "white",
                      fontWeight: "bold"
                    }}
                  />
                  <IconButton
                    onClick={idx === 1 ? handleStarClick : undefined}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "rgba(255,255,255,0.9)",
                      cursor: idx === 1 ? "pointer" : "default",
                      pointerEvents: idx === 1 ? "auto" : "none",
                      "&:hover": { bgcolor: "white" }
                    }}
                    disabled={idx !== 1}
                  >
                    <Star 
                      size={18} 
                      fill={idx === 1 && secretProgress.starClicks > 0 ? theme.color : "none"}
                      color={theme.color}
                      style={idx !== 1 ? { opacity: 0.5 } : {}}
                    />
                  </IconButton>
                </Box>
                <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {article.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
                    {article.summary}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      {article.date}
                    </Typography>
                    <Button 
                      size="small" 
                      sx={{ color: theme.color }}
                      disabled
                    >
                      Read More →
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Hidden hints */}
        <Box sx={{ textAlign: "center", mt: 8, mb: 4 }}>
          <Typography variant="caption" color="text.disabled" sx={{ userSelect: "none" }}>
            © 2025 {theme.name} 
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}