# YCS Architecture & Evolution

> **AI META-INSTRUCTION FOR UPDATING THIS DOCUMENT:** 
> When adding new rules or guidelines to this file:
> 1. **Categorize:** Always place new rules into an appropriate existing category, or create a clearly defined new category if one doesn't exist. Prevent this file from becoming a mixed, disorganized mess.
> 2. **Integrate Harmoniously:** **DO NOT** simply append a new line to the bottom of lists. Carefully read the existing content and integrate your new rule. Rephrase or restructure sections if necessary to keep the document clean, highly readable, and logically organized.

This document outlines the architectural journey of the Yebisu Creator Studio (YCS) across its major versions, leading up to the current V3 design.

## V1: The Foundation
V1 laid the groundwork for the core feature of YCS: injecting custom content directly into the game. 
* **Issues:** V1 suffered from severe cleanup problems. When an element was deleted in the UI, it often left behind orphaned assets or unused lines of code within the mod. This incomplete cleanup would eventually cause compilation or runtime errors.

## V2: The Manifest Approach
V2 attempted to solve the cleanup issues of V1 by introducing a tracking manifest.
* **Pros:** The deletion and tracking system did a great job of identifying exactly where items were injected so they could be safely cleaned up later.
* **Issues:** The UI became overly complicated (especially with the complex tile/snapping feature). More importantly, V2 suffered from modularity and state management problems—often clearing out forms unintentionally or completely forgetting saved data.

## V3: The JSON-Driven Standard (Current)
V3 aims to be the final, stable revision by combining the best parts of V2 with a robust data management strategy. 

### Core Principles
1. **Single JSON Per Object:** Every single entity created in YCS (an item, a block, a tab, etc.) will have its own dedicated JSON file. This file acts as the single source of truth for the object, containing its ID, display name, assigned creative tab, associated methods, and more.
2. **Total UI State Persistence:** Because the YCS UI strictly reads from these JSON files, forms will no longer clear themselves out or forget data. The UI simply reflects what is written in the JSON.
3. **Isolated Data Storage:** These JSON files will live exclusively within the YCS ecosystem (or an isolated directory). They will *not* be mixed into the main mod files. This ensures the main mod is never bogged down with YCS-specific metadata that the game engine doesn't need.
4. **V2-Style Injection Tracking:** V3 retains the excellent injection tracking and deletion system from V2. When YCS reads a JSON file to inject an item, it will still strictly track where those lines of code are placed so they can be flawlessly cleaned up if the user decides to delete the object.
5. **Smart Editing:** Editing an existing entry works flawlessly under this system. Because the JSON cleanly tracks every single field, YCS knows exactly which field was edited and what changed. It can pinpoint exactly what needs to be updated or re-injected without breaking the rest of the object.
