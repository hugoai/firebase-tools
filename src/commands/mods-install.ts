import * as _ from "lodash";
import * as clc from "cli-color";
import * as marked from "marked";
import * as ora from "ora";
import TerminalRenderer = require("marked-terminal");

import { populatePostinstall } from "../mods/populatePostinstall";
import * as askUserForConsent from "../mods/askUserForConsent";
import * as checkProjectBilling from "../mods/checkProjectBilling";
import * as Command from "../command";
import { FirebaseError } from "../error";
import { getRandomString } from "../mods/generateInstanceId";
import * as getProjectId from "../getProjectId";
import { createServiceAccountAndSetRoles } from "../mods/rolesHelper";
import * as modsApi from "../mods/modsApi";
import { resolveSource } from "../mods/resolveSource";
import * as paramHelper from "../mods/paramHelper";
import {
  ensureModsApiEnabled,
  getValidInstanceId,
  logPrefix,
  promptForValidInstanceId,
} from "../mods/modsHelper";
import * as requirePermissions from "../requirePermissions";
import * as utils from "../utils";
import * as logger from "../logger";

marked.setOptions({
  renderer: new TerminalRenderer(),
});

interface InstallModOptions {
  paramFilePath?: string;
  projectId: string;
  source: modsApi.ModSource;
}

async function installMod(options: InstallModOptions): Promise<void> {
  const { projectId, source, paramFilePath } = options;
  const spec = source.spec;
  const spinner = ora.default("Installing your mod instance. This usually takes 3 to 5 minutes...");
  try {
    await checkProjectBilling(projectId, spec.name, spec.billingRequired);
    const roles = spec.roles ? spec.roles.map((role: modsApi.Role) => role.role) : [];
    await askUserForConsent.prompt(spec.name, projectId, roles);

    const params = await paramHelper.getParams(projectId, _.get(spec, "params", []), paramFilePath);

    let instanceId = await getValidInstanceId(projectId, spec.name);
    spinner.start();
    let serviceAccountEmail;
    while (!serviceAccountEmail) {
      try {
        serviceAccountEmail = await createServiceAccountAndSetRoles(
          projectId,
          _.get(spec, "roles", []),
          instanceId
        );
      } catch (err) {
        if (err.status === 409) {
          spinner.stop();
          logger.info(err.message);
          instanceId = await promptForValidInstanceId(`${instanceId}-${getRandomString(4)}`);
          spinner.start();
        } else {
          throw err;
        }
      }
    }
    const response = await modsApi.createInstance(
      projectId,
      instanceId,
      source,
      params,
      serviceAccountEmail
    );
    spinner.stop();

    utils.logLabeledSuccess(
      logPrefix,
      `successfully installed ${clc.bold(spec.name)}, ` +
        `its Instance ID is ${clc.bold(instanceId)}.`
    );
    const usageInstruction =
      _.get(response, "configuration.populatedPostinstallContent") ||
      populatePostinstall(source.spec.postinstallContent || "", params);
    if (usageInstruction) {
      utils.logLabeledBullet(logPrefix, `usage instructions:\n${marked(usageInstruction)}`);
    } else {
      logger.debug("No usage instructions provided.");
    }
  } catch (err) {
    spinner.fail();
    if (err instanceof FirebaseError) {
      throw err;
    }
    throw new FirebaseError(`Error occurred installing mod: ${err.message}`, { original: err });
  }
}

/**
 * Command for installing a mod
 */
export default new Command("mods:install <modName>")
  .description("install a mod, given <modName> or <modName@versionNumber>")
  .option("--params <paramsFile>", "name of params variables file with .env format.")
  .before(requirePermissions, [
    // this doesn't exist yet, uncomment when it does
    // "firebasemods.instances.create"
  ])
  .before(ensureModsApiEnabled)
  .action(async (modName: string, options: any) => {
    try {
      const projectId = getProjectId(options, false);
      const paramFilePath = options.params;
      const sourceUrl = await resolveSource(modName);
      const source = await modsApi.getSource(sourceUrl);
      return installMod({
        paramFilePath,
        projectId,
        source,
      });
    } catch (err) {
      if (!(err instanceof FirebaseError)) {
        throw new FirebaseError(`Error occurred installing the mod: ${err.message}`, {
          original: err,
        });
      }
      throw err;
    }
  });
