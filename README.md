# Auto User Assigner Forge App

This Forge app automatically assigns users to a project role in Jira. A Q-factor algorithm
analyses recent, similar issues to select the most relevant user for the project.

## Setup

1. Run `forge register` if you haven't registered.
2. Deploy the app using `forge deploy`.
3. Install it using `forge install`.
4. Customize the `roleId` in `src/index.js` to match your target project role.

## Q-factor Algorithm

The Q-factor is a composite score derived from several "meta-state" factors:

- **Creation Time** – how recently an issue was created.
- **Activity** – the number of comments on the issue.
- **Component** – overlap of components with the target issue.
- **Text Similarity** – shared words in the issue summaries.

The app searches for recent issues in the same project that share components with the
current issue. It calculates the Q-factor for each reporter and automatically adds the
user with the highest score to the configured project role.

## Requirements

- Forge CLI
- Jira Cloud Development Environment
