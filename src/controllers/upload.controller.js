const UploadController = {
  async uploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: false,
          message: "Không có file nào được upload"
        });
      }

      const urls = req.files.map(
        (file) => `${process.env.URL_SERVER}/uploads/${file.filename}`
      );

      return res.status(200).json({
        status: true,
        message: "Upload ảnh thành công",
        data: urls
      });
    } catch (error) {
      console.error("uploadImages:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server khi upload ảnh"
      });
    }
  }
};

export default UploadController;
