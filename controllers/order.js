import Order from "../models/order.js";

export const getOrdersController = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");

    if (!orders || orders.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No Orders Found",
      });
    }
    return res.json(orders);
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Error while getting orders",
      error,
    });
  }
};

export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No Orders Found",
      });
    }
    res.json(orders);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error While getting All Orders",
      error,
    });
  }
};

export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const orders = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    res.json(orders)
  } catch (error) {
    res.status(500).send({
      succes: false,
      message: "Error While Changing The Order Status",
    });
  }
};
