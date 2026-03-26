# Safe IoT

A TypeScript REST API for generating customized allowlists of IP subnets, perfect for firewall configurations in pfSense, OPNsense, and other security appliances. Supports GitHub, AWS, Azure, and Google Cloud IP ranges.

## Features

- **Custom Allow Lists**: Generate IP subnet allowlists for firewall rules
- **Multi-Provider**: Retrieve and filter IP ranges from GitHub, AWS, Azure, and Google Cloud
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

   To run integration tests with live APIs:
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
docker run -p 3000:3000 -e HOSTS="/github/api,/azure/AzureCloud,/google/us-central1" safe-iot
```

### Graceful Shutdown

The application supports proper SIGTERM and SIGINT signal handling for graceful shutdowns, making it suitable for container orchestration platforms like Kubernetes.

### Firewall Integration

Use the API endpoints to generate allowlists for your firewall:

```bash
# Get all GitHub IPs
curl http://localhost:3000/github

# Get all Azure IPs
curl http://localhost:3000/azure

# Get specific Azure service tag
curl http://localhost:3000/azure/AzureKeyVault

# Get specific AWS service
curl http://localhost:3000/aws/EC2

# Get all Google Cloud IPs
curl http://localhost:3000/google

# Get specific Google Cloud region
curl http://localhost:3000/google/us-central1
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

All endpoints return newline-separated lists of IPv4 and IPv6 subnets, ready for firewall allowlists. An invalid or unknown service name returns an empty response (HTTP 200) rather than an error.

### Root

- `GET /` — Fetches and merges all paths listed in the `HOSTS` environment variable (comma-separated), returning a deduplicated newline-separated list of subnets.

  Example `.env`:
  ```
  HOSTS=/github/hooks,/aws/EC2,/azure/AzureCloud,/google/us-central1
  ```

### GitHub

See https://api.github.com/meta for available services.

| Endpoint | Description |
|---|---|
| `GET /github` | All GitHub IP subnets combined (validated) |
| `GET /github/:service` | IPs for a specific service (e.g. `hooks`, `web`, `api`, `git`) |

### AWS

See https://ip-ranges.amazonaws.com/ip-ranges.json for available services.

| Endpoint | Description |
|---|---|
| `GET /aws` | All AWS IP subnets across all services |
| `GET /aws/:service` | IPs for a specific service (e.g. `EC2`, `AMAZON`, `S3`) — case-insensitive |

### Azure

See https://azservicetags.azurewebsites.net/servicetag for available service tags.

| Endpoint | Description |
|---|---|
| `GET /azure` | All Azure IP subnets for the `AzureCloud` aggregate tag |
| `GET /azure/:serviceTag` | IPs for a specific Azure service tag (e.g. `AzureKeyVault`, `Storage`, `AzureDevOps`) |

### Google Cloud

See https://www.gstatic.com/ipranges/cloud.json for available regions.

| Endpoint | Description |
|---|---|
| `GET /google` | All Google Cloud IP subnets across all regions |
| `GET /google/:scope` | IPs for a specific Google Cloud region (e.g. `us-central1`, `europe-west1`, `asia-southeast1`) — case-insensitive |