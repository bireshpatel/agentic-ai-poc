/**
 * cucumber.js — Cucumber.js configuration consumed by the JetBrains Gherkin
 * plugin to locate feature files and step definitions for IDE navigation
 * (Cmd/Ctrl+Click on a step → "Go to Declaration").
 *
 * This file is NOT used by playwright-bdd at runtime; playwright.config.ts
 * drives the actual test execution via defineBddConfig().
 */
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.steps.ts', 'fixtures/**/*.ts'],
    requireModule: ['ts-node/register'],
  },
};
