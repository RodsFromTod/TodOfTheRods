# Rods From Tod
is a game I'm not smart or educated enough to get into a workable position, but I'm deeply passionate about the idea so I'm going to share what code there is. This code is in a broken state, the visuals for the terrain and the rod don't display, many of the later sections of code and files simply haven't been written, I'm not using up-to-date versions of all the libraries it depends on. But sometimes when you load the game, there's a pattern of rain, and you can zoom out to see clouds. And I think that part, at least, is nice.

I'm not good enough to finish this, but maybe it will give a starting platform for someone else, and thus won't need to be wasted.


# Rods From Tod - A physics-based Incremental Game Overview:

index.html - the page that we play from, of course

game.js - the javascript container that handles all the general game-logic and loading the other parts

physics.js - strictly the physics calculation code for the interactions between various systems

atmopshere.js - sub-system for physics that handles the atmospheric stuff like drag, wind, spin of the planet

weather.js - a separate weather subsystem that dynamically changes conditions (like rain, wind gusts, or cloud cover)

rods.js - sub-system for physics that handles the rods, their weight, density, impact force, speed, and the like

impact.js - sub-system for physics that handles rendering out the explosive impact and handles scoring it, this code is also responsible for figuring out ejecta and the like

ejecta.js - sub-system for physics that calculates the impact the ejecta has on the surrounding terrain

terrain.js - generates a field of grass and dirt and hills and trees in a random layout, which is where we'll be seeing the impacts occurring. This system is also a sub-system for physics and handles calculating out the resistance to the impact, therefore defining just how hard and what kind of surface is being impacted

visuals.js - this system handles rendering all the visuals for the game, so it interacts with and gets data most other systems and converts them into visual stuff, so it handles rendering the rod, the whole set of terrain, terrain objects, the whole 9 yards

upgrades.js - this system handles all the various upgradables the game has. We're moving on from JUST dropping tungsten to the game starting with just tossing a heavy metal rod into the air higher and higher, then eventually dropping heavier and heavier objects from high places, which eventually grows into dropping large heavy objects from weather balloons then into dropping tungsten rods, which leads into making more idealized low-drag shapes and eventually we achieve point of dropping giant rods of tungsten from low earth orbit, which eventual grows to medium earth orbit, and finally launching telephone pole size rods of tungsten from a geosynchronous high earth orbit. The cost of upgrades scales at an exponential rate so that they become harder and harder to buy, within each type of upgrade.

prestige.js - This system handles resetting the game to the start with all the regular upgrades reset while also allowing the player to buy prestige upgrades so that they can get further and further through the upgrades. It will be balanced so that it should take roughly 15 prestige events to achieve the final launch of the largest telephone pole size rods. This system is part of an "incremental" game design functionality. Prestige upgrades are like stronger versions of regular upgrades that never reset. The prestige upgrades are not reset by engaging in a prestige event. The prestige event gives the player a small amount of prestige currency to spend on the prestige upgrades. Each upgrade is unique and powerful but you have to buy the upgrades one at a time in order and their costs scale up quickly, though not logarithmically. Prestige currency is generated based on progress through the game such that a score that is twice as large as what is required to get 1 prestige point will only get 1.5 prestige points, and a score that is 4 times larger than what is required for 1 prestige point only gets 1.75 prestige points.

ascension.js - This system is unlocked by achieving the final launch in the base game and it handles creating new fictional planets with different kinds of gravity and atmospheric conditions, so it has to interface with some of the physics systems. The ascension event also forces a reset of both the regular upgrades and the prestige upgrades, but it gives the player permanent upgrades that will never reset for any reason. Specifically, each ascension will give the player a new upgrade that will increase some earlier aspect of the game via things like permanent multipliers to their score, or to how many prestige points they earn or one by one locking their prestige upgrades so that they won't reset when the player does a new ascension event.

saves.js - this system handles generating saves via local-storage browser functions and loading those saves to store the player's progress

options.js - this system is a menu button the player can click on to open a new window which has buttons to click on to save or load their game

stats.js - this system displayers stuff like the time-of-fall, the current altitude, the velocity, the current-energy, the impact crater size, and such

pip.js - this system handles the visual from the position of the rod that follows it as it falls

ui.js - this system with dynamically handle the creation of the UI, the placement of the elements, and allowing the user to move where the picture-in-picture element is placed, it will also slowly reveal more elements of the game as they become relevant, like revealing the prestige menu when prestige is unlocked and revealing the ascension menu when that is unlocked

shockwave.js - this system handles the atmospheric portion of the impact events and any kind of shockwaves produced as well as the result of those shockwaves on the terrain
