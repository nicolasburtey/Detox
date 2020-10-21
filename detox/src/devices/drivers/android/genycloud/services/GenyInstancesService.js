const Instance = require('./dto/GenyInstance');

class GenyInstancesService {
  constructor(genyCloudExec, deviceRegistry, instanceNaming) {
    this.genyCloudExec = genyCloudExec;
    this.deviceRegistry = deviceRegistry;
    this.instanceNaming = instanceNaming;
  }

  async findFreeInstance(recipeName) {
    const freeInstances = await this._getRelevantInstances(recipeName);
    return (freeInstances[0] || null);
  }

  async createInstance(recipeName) {
    const result = await this.genyCloudExec.startInstance(recipeName, this.instanceNaming.generateName());
    return new Instance(result.instance);
  }

  async connectInstance(instanceUUID) {
    const connectedInstance = await this.genyCloudExec.adbConnect(instanceUUID).instance;
    return new Instance(connectedInstance);
  }

  async stopInstance(instanceUUID) {
    return this.genyCloudExec.stopInstance(instanceUUID);
  }

  async _getRelevantInstances(recipeName) {
    const result = await this._getAllInstances();
    return result.filter((instance) =>
      instance.recipeName === recipeName &&
      this.instanceNaming.isFamilial(instance.name) &&
      this._isInstanceFree(instance)
    );
  }

  async _getAllInstances() {
    return (this
      .genyCloudExec.getInstances()).instances
      .map((rawInstance) => new Instance(rawInstance));
  }

  _isInstanceFree(instance) {
    if (!instance.isAdbConnected()) {
      return instance;
    }
    return !this.deviceRegistry.isDeviceBusy(instance.adbName);
  }
}

module.exports = GenyInstancesService;
