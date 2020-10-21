const _ = require('lodash');
const logger = require('../../../../utils/logger').child({ __filename });
const AndroidDriver = require('../AndroidDriver');
const GenyCloudExec = require('./exec/GenyCloudExec');
const RecipesService = require('./services/GenyRecipesService');
const InstancesService = require('./services/GenyInstancesService');

// TODO unit test
class GenyCloudDriver extends AndroidDriver {
  constructor(config) {
    super(config);

    const exec = new GenyCloudExec();
    this.recipeService = new RecipesService(exec, logger);
    this.instancesService = new InstancesService(exec);
    this._name = 'Unspecified Genymotion Cloud Emulator';
  }

  // TODO Remove this altogether if not needed
  // get name() {
  //   return this._name
  // }

  async acquireFreeDevice(deviceQuery) {
    const recipeName = _.isPlainObject(deviceQuery) ? deviceQuery.recipeName : deviceQuery; // TODO consider recipeUUID
    const recipe = await this.recipeService.getRecipeByName(recipeName);

    const { adbName, coldBoot } = await this.allocateDevice(recipe);

    await this.emitter.emit('bootDevice', { coldBoot, deviceId: adbName, type: recipeName});
    await this.adb.apiLevel(adbName);
    await this.adb.disableAndroidAnimations(adbName);

    this._name = `Genycloud ${adbName} (${recipeName})`;
    return adbName;
  }

  async doAllocateDevice(recipe) {
    let coldBoot = false;
    let instance = await this.instancesService.findFreeInstance(recipe);
    if (!instance) {
      instance = await this.instancesService.launchInstance(recipe);
      coldBoot = true;
    }

    if (!instance.isAdbConnected()) {
      instance = await this.instancesService.connectInstance(instance.uuid);
    }

    return {
      adbName: instance.adbName,
      coldBoot,
    };
  }
}
