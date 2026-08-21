type ClerkEmailAddress = {
  emailAddress?: string | null;
};

type ClerkUserLike = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: ClerkEmailAddress | null;
  emailAddresses?: ClerkEmailAddress[] | null;
};

export class ClerkUserProfile {
  private readonly user: ClerkUserLike | null | undefined;

  private constructor(user: ClerkUserLike | null | undefined) {
    this.user = user;
  }

  static fromUser(user: ClerkUserLike | null | undefined) {
    return new ClerkUserProfile(user);
  }

  getDisplayName() {
    return (
      this.clean(this.user?.fullName) ||
      this.clean([this.user?.firstName, this.user?.lastName].filter(Boolean).join(' ')) ||
      this.clean(this.user?.username) ||
      this.getEmail() ||
      'Usuario'
    );
  }

  getEmail() {
    return (
      this.clean(this.user?.primaryEmailAddress?.emailAddress) ||
      this.clean(this.user?.emailAddresses?.[0]?.emailAddress) ||
      null
    );
  }

  private clean(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
