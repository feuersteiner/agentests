class User < ApplicationRecord
  has_many :orders, dependent: :restrict_with_error

  validates :login, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: /\A[a-z0-9_]{3,30}\z/ }
  validates :email, presence: true, uniqueness: { case_sensitive: false }

  def to_param
    login
  end

  def display_name
    name.presence || login
  end

  def legacy_plan?
    legacy_plan_id.present?
  end
end
