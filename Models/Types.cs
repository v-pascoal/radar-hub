
namespace RadarHub.Models;

public enum UserRole
{
    CLIENT,
    LAWYER,
    GUEST
}

public enum ProcessStatus
{
    OPEN,
    PENDING,
    ACCEPTED,
    REJECTED,
    IN_PROGRESS,
    COMPLETED
}

public class ProcessRequest
{
    public string Id { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string Type { get; set; } = "Suspensão";
    public int Points { get; set; }
    public decimal Value { get; set; }
    public string Deadline { get; set; } = string.Empty;
    public ProcessStatus Status { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class User
{
    public string Name { get; set; } = "Visitante";
    public UserRole Role { get; set; } = UserRole.GUEST;
    public bool IsLoggedIn { get; set; }
}
