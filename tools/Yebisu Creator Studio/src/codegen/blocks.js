import { MODID } from '../constants.js';

export function gBlockEntries(block,textures=[]){
  const id=block.id||"my_block",CN=block.customConstName?block.constName:id.toUpperCase(),dn=block.displayName||id;
  const str=parseFloat(block.strength)||2.0,snd=block.soundType||"WOOD",tf="";
  const props=`BlockBehaviour.Properties.of()\n                    .strength(${str}f)\n                    .sound(SoundType.${snd})${tf}`;
  const orient=block.orientationType||"simple";
  const dropType=orient==="simple"?(block.dropType||"Self"):"Self";
  const hasFortune=!!block.dropFortune;
  let lt=`dropSelf(ModBlocks.${CN}.get());`;
  if(dropType==="Custom"||dropType==="Ore"){
    const itemRef=block.dropItem?`net.minecraft.core.registries.BuiltInRegistries.ITEM.get(ResourceLocation.parse("${block.dropItem}"))`:`net.minecraft.world.item.Items.COAL`;
    if(hasFortune){
      lt=`add(ModBlocks.${CN}.get(), block -> createOreDrop(ModBlocks.${CN}.get(), ${itemRef}));`;
    } else {
      lt=`add(ModBlocks.${CN}.get(), block -> createSingleItemTableWithSilkTouch(ModBlocks.${CN}.get(), ${itemRef}));`;
    }
  }
  let bp=props;
  let cls="Block";
  if((dropType==="Custom"||dropType==="Ore")&&hasFortune){
    cls="DropExperienceBlock";
    const xp=block.dropXp||"1";
    const [minXp,maxXp]=xp.includes("-")?xp.split("-"):[xp,xp];
    bp=`net.minecraft.util.valueproviders.UniformInt.of(${parseInt(minXp)||1}, ${parseInt(maxXp)||1}), ${props}`;
  }
  const entries=[];
  let ml="",bsp="",loot=lt,mdl="";
  if(orient==="pillar"){
    ml=`public static final DeferredBlock<RotatedPillarBlock> ${CN} = registerBlock("${id}",\n        () -> new RotatedPillarBlock(${bp}));`;
    bsp=`ModelFile ${id}Model = models().cubeBottomTop("${id}", modLoc("block/${id}_side"), modLoc("block/${id}_bottom"), modLoc("block/${id}_top"));\n        axisBlock((RotatedPillarBlock)ModBlocks.${CN}.get(), ${id}Model, ${id}Model);\n        simpleBlockItem(ModBlocks.${CN}.get(), ${id}Model);`;
    mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
  }
  else if(orient==="directional"){
    ml=`public static final DeferredBlock<Block> ${CN} = registerBlock("${id}",\n        () -> new Block(${bp}) {\n            {\n                this.registerDefaultState(this.stateDefinition.any().setValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.HORIZONTAL_FACING, net.minecraft.core.Direction.NORTH));\n            }\n            @Override\n            protected void createBlockStateDefinition(net.minecraft.world.level.block.state.StateDefinition.Builder<Block, net.minecraft.world.level.block.state.BlockState> builder) {\n                builder.add(net.minecraft.world.level.block.state.properties.BlockStateProperties.HORIZONTAL_FACING);\n            }\n            @Override\n            public net.minecraft.world.level.block.state.BlockState getStateForPlacement(net.minecraft.world.item.context.BlockPlaceContext context) {\n                return this.defaultBlockState().setValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.HORIZONTAL_FACING, context.getHorizontalDirection().getOpposite());\n            }\n        });`;
    bsp=`ModelFile ${id}Model = models().withExistingParent("${id}", "minecraft:block/cube")\n            .texture("particle", modLoc("block/${id}_front"))\n            .texture("down", modLoc("block/${id}_bottom"))\n            .texture("up", modLoc("block/${id}_top"))\n            .texture("north", modLoc("block/${id}_front"))\n            .texture("south", modLoc("block/${id}_back"))\n            .texture("east", modLoc("block/${id}_right"))\n            .texture("west", modLoc("block/${id}_left"));\n        horizontalBlock(ModBlocks.${CN}.get(), ${id}Model);\n        simpleBlockItem(ModBlocks.${CN}.get(), ${id}Model);`;
    mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
  }
  else{
    ml=`public static final DeferredBlock<${cls}> ${CN} = registerBlock("${id}",\n        () -> new ${cls}(${bp}));`;
    bsp=`blockWithItem(ModBlocks.${CN});`;
    mdl=`getBuilder(ModBlocks.${CN}.getId().getPath()).parent(new ModelFile.UncheckedModelFile("${MODID}:block/${id}"));`;
  }
  entries.push({line:ml,constName:CN,bspLines:bsp,lootLine:loot,modelLine:mdl,langKey:`block.${MODID}.${id}`,langVal:dn,blockId:id});
  const bt=`blockTexture(ModBlocks.${CN}.get())`;
  const bId=id.endsWith("_block")?id.slice(0,-6):id,bCN=CN.endsWith("_BLOCK")?CN.slice(0,-6):CN;
  const sbp=`BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd})${tf}`;
  const mk=(sfx,scls,extra,bs,slt,mod,lv)=>{const nId=`${bId}${sfx}`,nCN=`${bCN}${sfx.toUpperCase()}`;entries.push({line:`public static final DeferredBlock<${scls}> ${nCN} = registerBlock("${nId}",\n        () -> new ${scls}(${extra}));`,constName:nCN,bspLines:bs,lootLine:slt,modelLine:mod,langKey:`block.${MODID}.${nId}`,langVal:`${dn} ${lv}`,blockId:nId});};
  if(block.createSlab)mk("_slab","SlabBlock",sbp,`slabBlock(ModBlocks.${bCN}_SLAB.get(),${bt},${bt});\n        blockItem(ModBlocks.${bCN}_SLAB);`,`add(ModBlocks.${bCN}_SLAB.get(),b->createSlabItemTable(ModBlocks.${bCN}_SLAB.get()));`,"/*slab*/","Slab");
  if(block.createStairs)mk("_stairs","StairBlock",`ModBlocks.${CN}.get().defaultBlockState(),${sbp}`,`stairsBlock(ModBlocks.${bCN}_STAIRS.get(),${bt});\n        blockItem(ModBlocks.${bCN}_STAIRS);`,`dropSelf(ModBlocks.${bCN}_STAIRS.get());`,"/*stairs*/","Stairs");
  if(block.createFence)mk("_fence","FenceBlock",sbp,`fenceBlock(ModBlocks.${bCN}_FENCE.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_FENCE.get());`,`fenceItem(ModBlocks.${bCN}_FENCE,ModBlocks.${CN});`,"Fence");
  if(block.createFenceGate)mk("_fence_gate","FenceGateBlock",`WoodType.OAK,${sbp}`,`fenceGateBlock(ModBlocks.${bCN}_FENCE_GATE.get(),${bt});\n        blockItem(ModBlocks.${bCN}_FENCE_GATE);`,`dropSelf(ModBlocks.${bCN}_FENCE_GATE.get());`,"/*fgate*/","Fence Gate");
  if(block.createWall)mk("_wall","WallBlock",sbp,`wallBlock(ModBlocks.${bCN}_WALL.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_WALL.get());`,`wallItem(ModBlocks.${bCN}_WALL,ModBlocks.${CN});`,"Wall");
  if(block.createPressurePlate)mk("_pressure_plate","PressurePlateBlock",`BlockSetType.IRON,${sbp}`,`pressurePlateBlock(ModBlocks.${bCN}_PRESSURE_PLATE.get(),${bt});\n        blockItem(ModBlocks.${bCN}_PRESSURE_PLATE);`,`dropSelf(ModBlocks.${bCN}_PRESSURE_PLATE.get());`,"/*pp*/","Pressure Plate");
  if(block.createButton)mk("_button","ButtonBlock",`BlockSetType.IRON,20,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noCollission()${tf}`,`buttonBlock(ModBlocks.${bCN}_BUTTON.get(),${bt});`,`dropSelf(ModBlocks.${bCN}_BUTTON.get());`,`buttonItem(ModBlocks.${bCN}_BUTTON,ModBlocks.${CN});`,"Button");
  if(block.createDoor)mk("_door","DoorBlock",`BlockSetType.IRON,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noOcclusion()${tf}`,`doorBlockWithRenderType(ModBlocks.${bCN}_DOOR.get(),modLoc("block/${bId}_door_bottom"),modLoc("block/${bId}_door_top"),"cutout");`,`add(ModBlocks.${bCN}_DOOR.get(),b->createDoorTable(ModBlocks.${bCN}_DOOR.get()));`,`basicItem(ModBlocks.${bCN}_DOOR.asItem());`,"Door");
  if(block.createTrapdoor)mk("_trapdoor","TrapDoorBlock",`BlockSetType.IRON,BlockBehaviour.Properties.of().strength(${str}f).sound(SoundType.${snd}).noOcclusion()${tf}`,`trapdoorBlockWithRenderType(ModBlocks.${bCN}_TRAPDOOR.get(),modLoc("block/${bId}_trapdoor"),true,"cutout");\n        blockItem(ModBlocks.${bCN}_TRAPDOOR,'_bottom');`,`dropSelf(ModBlocks.${bCN}_TRAPDOOR.get());`,"/*trapdoor*/","Trapdoor");
  return entries;
}
