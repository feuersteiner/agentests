class User < ApplicationRecord
  has_many :orders, dependent: :restrict_with_error

  validates :username, presence: true, uniqueness: { case_sensitive: false },
                       format: { with: /\A[a-z0-9_]{3,30}\z/ }
  validates :email, presence: true, uniqueness: { case_sensitive: false }

  def to_param
    username
  end

  def display_name
    name.presence || username
  end
end
