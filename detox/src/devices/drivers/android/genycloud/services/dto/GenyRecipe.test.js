describe('Genymotion-Cloud Recipe DTO', () => {
  it('should have a uuid', () => {
    const rawRecipe = {
      uuid: 'mock-uuid',
      name: 'mock-name',
    };

    const Recipe = require('./GenyRecipe');
    const recipe = new Recipe(rawRecipe);

    expect(recipe.uuid).toEqual('mock-uuid');
  });
});
