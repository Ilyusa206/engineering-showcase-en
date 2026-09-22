# Runbook: isolated VM restore

Sanitized reconstruction of an executed and verified infrastructure restore procedure. Site-specific commands and identifiers are intentionally absent.

## Objective

Prove that a VM backup can be read, restored under a distinct identity and booted without colliding with the production VM or network.

## Preconditions

- A change/incident owner and restore point are recorded.
- The backup verification succeeded and target storage has sufficient headroom.
- A new temporary VM identity has been reserved.
- The restore network is isolated from production.
- Application owners understand that a booted VM alone does not prove application data consistency.

## Procedure

1. Record the backup timestamp, source workload, target storage, expected disks and VM configuration.
2. Restore into a new temporary identity. Never overwrite the production VM as the first restore step.
3. Generate unique virtual hardware identifiers where supported.
4. Disconnect every virtual NIC before first boot.
5. Compare source and restored CPU, memory, disks, firmware, boot order and controllers.
6. Boot the restored VM in isolation.
7. Check hypervisor state, console boot, storage read/write I/O and guest telemetry where available.
8. Check the application through the isolated network or console.
9. Record what the test established and which boundaries remain untested.
10. Stop and remove the temporary VM after evidence capture unless it has an approved recovery purpose.

## Success criteria

- The snapshot is readable and expected disks/configuration restore.
- Restored storage supports read/write I/O and the guest reaches the expected boot state.
- No duplicate hostname, address, directory identity or application writer appears in production.

## Stop conditions

- Insufficient confirmed target capacity or a risk of overwriting an existing volume.
- Network isolation cannot be confirmed.
- Backup chain reports corruption or missing chunks.
- Two stateful copies could write to the same production data.

## Evidence record

```text
Change/incident ID:
Source workload:
Restore point:
Temporary identity:
Target storage:
Network isolation:
Boot result:
Storage I/O result:
Application checks:
Unproven boundaries:
Cleanup result:
```

An isolated boot verifies the infrastructure chain: backup job → stored snapshot → read → restore → boot. It does not establish database transaction consistency, directory recovery semantics or an application recovery point; test those separately for the workload.
