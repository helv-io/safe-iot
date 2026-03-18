# Safe IoT

A TypeScript REST API for creating customized allowlists of IP subnets, perfect for firewall configurations in pfSense, OPNsense, and other security appliances. Currently supports GitHub's IP ranges for secure IoT deployments.

## Features

- **Custom Allow Lists**: Generate IP subnet allowlists for firewall rules
- **GitHub Integration**: Retrieve and filter GitHub's official IP ranges
- **Firewall Ready**: Output format compatible with pfSense, OPNsense, and similar firewalls
- **Docker Support**: Containerized deployment with multi-platform builds
- **Comprehensive Testing**: Unit and integration tests with live API validation

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create a `.env` file based on `.env.example` to configure environment variables.

4. Run tests:
   ```bash
   npm test
   ```

   To run integration tests with live GitHub API:
   ```bash
   RUN_INTEGRATION_TESTS=true npm test
   ```

5. Run in development mode:
   ```bash
   npm run dev
   ```

## Docker

Build and run with Docker:

```bash
# Build the image
docker build -t safe-iot .

# Run the container
docker run -p 3000:3000 --env-file .env safe-iot
```

Or with environment variables:
```bash
docker run -p 3000:3000 -e LISTS="/github/api,/github/web" safe-iot
```

### Graceful Shutdown

The application supports proper SIGTERM and SIGINT signal handling for graceful shutdowns, making it suitable for container orchestration platforms like Kubernetes.

### Firewall Integration

Use the API endpoints to generate allowlists for your firewall:

```bash
# Get all GitHub IPs for firewall allowlist
curl http://localhost:3000/github

# Get specific subnet groups
curl http://localhost:3000/github/api
curl http://localhost:3000/github/web
```

Copy the returned IP subnets directly into your pfSense/OPNsense firewall rules.

## Code Quality

- **Linting**: `npm run lint` (uses Biome)
- **Formatting**: `npm run format` (uses Biome with custom rules: single quotes, no semicolons, 2-space indentation)

## Releases

This project uses [release-it](https://github.com/release-it/release-it) for automated versioning and releases.

### Creating a Release

```bash
# Dry run to see what would happen
npx release-it --dry-run

# Create a new release (patch, minor, or major)
npx release-it

# Or specify the version bump
npx release-it patch
npx release-it minor  
npx release-it major
```

The release process will:
- Update `package.json` version
- Create a git tag (`v1.2.3`)
- Generate a GitHub release with changelog
- Trigger Docker image build with proper tags

### Docker Image Tags

- `latest`: Latest release version
- `dev`: Latest commit on main branch
- `v1.2.3`: Specific version tags (without 'v' prefix)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## API Endpoints

All endpoints return newline-separated lists of IPv4 and IPv6 subnets, perfect for firewall allowlists.

### GitHub
- `GET /github` - Returns all GitHub IP subnets combined (filtered and validated)
- `GET /github/:subpath` - Returns IP subnets for a specific GitHub service (e.g., `hooks`, `web`, `api`, `git`)

### AWS
- `GET /aws` - Returns all AWS IP subnets from all services
- `GET /aws/:service` - Returns IP subnets for a specific AWS service (e.g., `EC2`, `AMAZON`, `S3`) - case insensitive