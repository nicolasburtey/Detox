describe('Genymotion-Cloud instances service', () => {
  const anInstance = () => ({
    uuid: 'mock-instance-uuid',
    name: 'mock-instance-name',
    adb_serial: 'mock-serial:1111',
    recipe: {
      name: 'mock-recipe-name',
    }
  });

  let exec;
  let deviceRegistry;
  let instanceNaming;
  let uut;
  beforeEach(() => {
    const GenyCloudExec = jest.genMockFromModule('../exec/GenyCloudExec');
    exec = new GenyCloudExec();

    const DeviceRegistry = jest.genMockFromModule('../../../../DeviceRegistry');
    deviceRegistry = new DeviceRegistry();

    const GenyInstanceNaming = jest.genMockFromModule('./GenyInstanceNaming');
    instanceNaming = new GenyInstanceNaming();

    const GenyInstanceService = require('./GenyInstancesService');
    uut = new GenyInstanceService(exec, deviceRegistry, instanceNaming);
  });

  describe('free-instances lookup', () => {
    const aDisconnectedInstance = () => ({
      ...anInstance(),
      adb_serial: '0.0.0.0',
    });
    const anotherInstance = () => ({
      ...anInstance(),
      uuid: 'mock-instance-uuid2',
      name: 'mock-instance-name2',
    });
    const anInstanceOfOtherRecipe = () => ({
      ...anInstance(),
      recipe: {
        name: 'other-mock-recipe-name',
      },
    });

    const givenAllDevicesBusy = () => deviceRegistry.isDeviceBusy.mockReturnValue(true);
    const givenAllDevicesFree = () => deviceRegistry.isDeviceBusy.mockReturnValue(false);
    const givenInstances = (...instances) => exec.getInstances.mockReturnValue({ instances });
    const givenNoInstances = () => exec.getInstances.mockReturnValue({ instances: [] });
    const givenAllDevicesFamilial = () => instanceNaming.isFamilial.mockReturnValue(true);
    const givenNoDevicesFamilial = () => instanceNaming.isFamilial.mockReturnValue(false);

    it('should return null if there are no cloud-instances available', async () => {
      givenNoInstances();
      givenAllDevicesFree();
      givenAllDevicesFamilial();
      expect(await uut.findFreeInstance('mock-recipe-name')).toEqual(null);
    });

    it('should return a free instance', async () => {
      const instance = anInstance();
      givenInstances(instance);
      givenAllDevicesFree();
      givenAllDevicesFamilial();

      const result = await uut.findFreeInstance(instance.recipe.name);
      expect(result.uuid).toEqual(instance.uuid);
      expect(result.constructor.name).toContain('Instance');
    });

    it('should not return an instance of a different recipe', async () => {
      const instance = anInstance();
      givenInstances(instance);
      givenAllDevicesFree();
      givenAllDevicesFamilial();

      expect(await uut.findFreeInstance('different-recipe-name')).toEqual(null);
    });

    it('should not return an instance whose name isn\'t in the family', async () => {
      const instance = anInstance();
      givenInstances(instance);
      givenAllDevicesFree();
      givenNoDevicesFamilial();

      expect(await uut.findFreeInstance(instance.recipe.name)).toEqual(null);
      expect(instanceNaming.isFamilial).toHaveBeenCalledWith(instance.name);
    });

    it('should not return an instance marked "busy"', async () => {
      const instance = anInstance();
      givenInstances(instance);
      givenAllDevicesBusy();
      givenAllDevicesFamilial();

      expect(await uut.findFreeInstance(instance.recipe.name)).toEqual(null);
      expect(deviceRegistry.isDeviceBusy).toHaveBeenCalledWith(instance.adb_serial);
    });

    it('should return a disconnected instance', async () => {
      const instance = aDisconnectedInstance();
      givenInstances(instance);
      givenAllDevicesFree();
      givenAllDevicesFamilial();

      const result = await uut.findFreeInstance(instance.recipe.name);
      expect(result.uuid).toEqual(instance.uuid);
      expect(deviceRegistry.isDeviceBusy).not.toHaveBeenCalled();
    });

    it('should filter multiple matches of multiple instances', async () => {
      const instance = anInstance();
      givenInstances(anInstanceOfOtherRecipe(), instance, anotherInstance());
      givenAllDevicesFree();
      givenAllDevicesFamilial();

      const result = await uut.findFreeInstance(instance.recipe.name);
      expect(result.uuid).toEqual(instance.uuid);
    });
  });

  describe('device instance creation', () => {
    const givenInstanceBirthName = (name) => instanceNaming.generateName.mockReturnValue(name);
    const givenResultedInstance = (instance) => exec.startInstance.mockResolvedValue({ instance });

    it('should create an instance according to recipe', async () => {
      const instance = anInstance();
      givenInstanceBirthName(instance.name);
      givenResultedInstance(instance);

      await uut.createInstance(instance.recipe.name);
      expect(exec.startInstance).toHaveBeenCalledWith(instance.recipe.name, instance.name);
    });

    it('should return the newly created instance', async () => {
      const instance = anInstance();
      givenInstanceBirthName(instance.name);
      givenResultedInstance(instance);

      const result = await uut.createInstance(instance.recipe.name);
      expect(result).toBeDefined();
      expect(result.uuid).toEqual(instance.uuid);
      expect(result.name).toEqual(instance.name);
      expect(result.recipeUUID).toEqual(instance.recipe.uuid);
      expect(result.constructor.name).toContain('Instance');
    });
  });
});
