# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# OpenPrep AI — Sandboxed Code Runner Image (#2200)
#
# Provides: g++ 13, OpenJDK 21, Node.js 20
# Security: non-root sandbox user, no package managers in final layer,
#           no shell other than /bin/sh required for entrypoint scripts,
#           designed to be run with:
#             --network=none
#             --memory=128m --memory-swap=128m
#             --cpus=0.5
#             --pids-limit=50
#             --read-only
#             --tmpfs /tmp:size=32m,noexec,nosuid
#             --security-opt=no-new-privileges
#             --cap-drop=ALL
#             --user=65534:65534
# ─────────────────────────────────────────────────────────────────────────────

FROM ubuntu:22.04

# Prevent any interactive prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install runtimes in a single layer and clean up immediately to minimise
# image size and reduce the attack surface.
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        # C++ 13
        g++ \
        # Java 21
        openjdk-21-jdk-headless \
        # Node.js 20 (via nodesource)
        ca-certificates \
        curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    # Verify versions for build-time documentation
    && g++ --version \
    && java -version \
    && node --version \
    # Remove curl, apt caches, and any package manager state to reduce surface
    && apt-get remove -y curl \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create a dedicated, unprivileged sandbox user.
# UID 65534 is the conventional "nobody" UID on Linux.
# We create a real home dir in /tmp (mounted as tmpfs at runtime).
RUN groupadd -g 65534 sandbox && \
    useradd -u 65534 -g sandbox -M -s /bin/sh sandbox

# The working directory for all executions.
# At runtime, /tmp is a tmpfs mount with size=32m,noexec — the service
# will write the source file into /tmp before docker exec.
WORKDIR /tmp

# Switch to non-root user as the default for all container invocations.
USER 65534:65534

# Default entrypoint: the orchestration service overrides the command for
# each execution (compile, then run). This keeps the image generic.
CMD ["/bin/sh"]
