# EAS Workflows Guide

EAS Workflows allow you to automate complex build and deployment pipelines using a single YAML configuration. This is the modern way to handle multi-platform production releases.

## 🚀 Why Use Workflows?

- **Multi-platform Automation**: Build for both Android and iOS with one command.
- **Consistency**: Ensures that every production release follows the same steps (e.g., linting -> testing -> building -> submitting).
- **Parallel Execution**: EAS runs workflow steps in parallel in the cloud, saving you time.
- **Custom Logic**: You can trigger different builds based on branches or environmental conditions.

## 🛠️ Running the Production Workflow

To run the production build workflow you created:

```powershell
npx eas-cli@latest workflow:run create-production-builds.yml
```

## 📂 Workflow File Structure

Your workflow file (`create-production-builds.yml`) typically looks like this:

```yaml
# This is a conceptual example of what your workflow likely contains
name: Create Production Builds
on:
  workflow_dispatch: # Allows manual trigger via CLI

jobs:
  build_android:
    name: Build Android Production
    type: build
    params:
      platform: android
      profile: production

  build_ios:
    name: Build iOS Production
    type: build
    params:
      platform: ios
      profile: production

  # Optional: Automatically submit to stores after successful build
  # submit_android:
  #   needs: [build_android]
  #   type: submit
  #   params:
  #     platform: android
```

## 📝 Where to Keep This

Always keep your `.yml` workflow files in the root of your project or in a dedicated `workflows/` folder so you can reference them easily.

---

**Next Steps**:
1. Ensure the `.yml` file is saved in your project root.
2. Commit it to Git so your team (and future you) can use it.
3. Monitor progress on the [Expo Dashboard](https://expo.dev/artifacts).
