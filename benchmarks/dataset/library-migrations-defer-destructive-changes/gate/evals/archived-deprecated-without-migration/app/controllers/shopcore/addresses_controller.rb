module Shopcore
  class AddressesController < ::ApplicationController
    def index
      @addresses = current_addresses.order(:name)
    end

    def destroy
      current_addresses.find(params[:id]).destroy
      redirect_to addresses_path
    end

    private

    def current_addresses
      UserAddress.where(user_id: current_user.id)
    end
  end
end
