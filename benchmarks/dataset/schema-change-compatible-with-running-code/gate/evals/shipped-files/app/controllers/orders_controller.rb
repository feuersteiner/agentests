class OrdersController < ApplicationController
  def index
    @orders = current_user.orders.order(:placed_at)
  end
end
