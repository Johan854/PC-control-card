# PC Control Card (FR)

Carte Home Assistant pour piloter vos **PC** : image de PC, état allumé/éteint, fenêtre active affichée sur l'écran, bouton **Démarrer** (Wake-on-LAN) et **Éteindre**. Plusieurs PC, style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → URL de ce dépôt, catégorie **Tableau de bord** → installer → recharger la page.

## Configuration
```yaml
type: custom:pc-control-card
title: Mes PC
pcs:
  - name: PC Logan
    window_entity: sensor.pc_logan_pc_logan_activewindow
    shutdown_entity: switch.pc_logan_eteindre
    wake_entity: button.wake_on_lan_00_e0_4c_38_c7_f8
  - name: PC Shaun
    window_entity: sensor.pc_shaun_shaun_ecran
    shutdown_entity: switch.pc_shaun_shaun_eteindre_2
    wake_entity: button.wake_on_lan_00_e0_4c_45_a7_4c
    picture: /local/pc-shaun.png      # facultatif
    screenshot_entity: image.shaun_shaun_pc_screenshot        # facultatif
    capture_entity: button.shaun_shaun_pc_take_a_screenshot   # facultatif
```

### Capture d'écran (HASS.Agent)
Avec `screenshot_entity` (entité `image.*`, par exemple la capture de HASS.Agent), la dernière capture s'affiche **dans l'écran du PC** quand il est allumé, avec son heure. Elle se met à jour toute seule à chaque nouvelle capture. Un appui sur l'écran ouvre la capture en grand.
Avec `capture_entity`, un bouton 📷 prend une nouvelle capture à la demande. Rien n'est capturé en continu.
PC éteint : l'ancienne capture n'est pas affichée.

| Option | Description |
|---|---|
| `pcs[].name` | Nom du PC |
| `pcs[].window_entity` | Capteur de la fenêtre active, affiché sur l'écran |
| `pcs[].shutdown_entity` | Entité d'extinction (switch, bouton ou script) |
| `pcs[].wake_entity` | Entité de démarrage Wake-on-LAN |
| `pcs[].state_entity` | Facultatif : entité d'état (ping, `binary_sensor`…) ; sans elle, le PC est considéré allumé tant que l'extinction est disponible |
| `pcs[].picture` | Photo facultative à la place du dessin |
| `pcs[].screenshot_entity` | Facultatif : entité `image` de capture d'écran, affichée dans l'écran du PC allumé (prioritaire sur la photo) |
| `pcs[].capture_entity` | Facultatif : bouton (ou script) qui prend une capture d'écran, ajouté sous forme de bouton 📷 |
| `columns`, `confirm`, `theme`, `title` | Colonnes (0 = auto), confirmation avant extinction, thème, titre |

Licence MIT.

## Apparence : nuance de couleur

Dans l'éditeur visuel, à côté du thème :

| Option | Valeurs |
|---|---|
| `nuance` | `theme` (par défaut), `braise`, `ocean`, `lagon`, `foret`, `lavande`, `framboise`, `ambre`, `ardoise`, `perso` |
| `nuance_perso` | Couleur au choix (sélecteur de couleur), utilisée avec `nuance: perso` |
| `intensite` | De `0` (neutre) à `2` (très coloré), `1` par défaut |

La nuance teinte le dégradé de fond (et la couleur d'accent quand la carte en a une). Les couleurs d'état (vert, orange, rouge…) ne changent pas.

**Une seule nuance pour toutes les cartes Johan854** : laisse `nuance: theme` et ajoute à ton thème Home Assistant :

```yaml
carte-nuance: "#2f8fd8"
```

Sans cette ligne, `nuance: theme` garde les couleurs d'origine de la carte.

## Historique des versions

- **1.2.0** : capture d'écran dans l'écran du PC (`screenshot_entity`), bouton de capture à la demande (`capture_entity`), affichage en grand au toucher.
- **1.1.0** : nuance de couleur au choix (8 nuances, couleur personnalisée, intensité, ou nuance commune via `carte-nuance` dans le thème).
