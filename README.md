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
```

| Option | Description |
|---|---|
| `pcs[].name` | Nom du PC |
| `pcs[].window_entity` | Capteur de la fenêtre active, affiché sur l'écran |
| `pcs[].shutdown_entity` | Entité d'extinction (switch, bouton ou script) |
| `pcs[].wake_entity` | Entité de démarrage Wake-on-LAN |
| `pcs[].state_entity` | Facultatif : entité d'état (ping, `binary_sensor`…) ; sans elle, le PC est considéré allumé tant que l'extinction est disponible |
| `pcs[].picture` | Photo facultative à la place du dessin |
| `columns`, `confirm`, `theme`, `title` | Colonnes (0 = auto), confirmation avant extinction, thème, titre |

Licence MIT.
